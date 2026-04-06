const {
  createTicket,
  getTicketById,
  getTicketsByCompany,
  getTicketsAssignedToUser,
  getTicketsCreatedByUser,
  getAllTickets,
  updateTicketStatus,
  assignTicketToEngineer,
  getOverdueTickets,
} = require('../services/ticketService');

const {
  addComment,
  getTicketComments,
  getAllTicketComments,
} = require('../services/commentService');

const {
  getTicketAttachments,
  addAttachment,
} = require('../services/attachmentService');

const { getSLACountdown, formatDate } = require('../utils/sla');
const { body } = require('express-validator');

/**
 * Create ticket
 */
const createNewTicket = async (req, res) => {
  try {
    console.log(`\n🎯 [TICKET CONTROLLER] CREATE TICKET ENDPOINT CALLED`);
    console.log(`   UserId: ${req.userId}, CompanyId: ${req.companyId}`);
    
    const { title, description, priorityId, productId, attachments = [] } = req.body;
    const { userId, companyId } = req;

    console.log(`   Title: ${title}`);
    console.log(`   Description: ${description?.substring(0, 50)}`);

    if (!title || !description || !priorityId) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and priority are required',
      });
    }

    const ticketId = await createTicket(title, description, companyId, userId, priorityId, productId || null);
    console.log(`✅ [TICKET CONTROLLER] Ticket created: #${ticketId}`);

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create ticket',
      });
    }

    // Trigger email notifications (non-blocking)
    console.log(`📧 [TICKET CONTROLLER] Calling notifyTicketCreated...`);
    const { notifyTicketCreated } = require('../services/notificationService');
    notifyTicketCreated(ticketId).then(() => {
      console.log(`✅ [TICKET CONTROLLER] notifyTicketCreated completed`);
    }).catch(err => {
      console.error(`❌ [TICKET CONTROLLER] Email notification error:`, err.message);
      console.error(err.stack);
    });

    if (Array.isArray(attachments) && attachments.length > 0) {
      const validAttachments = attachments.filter(
        (attachment) => attachment?.fileName?.trim() && attachment?.filePath?.trim()
      );

      for (const attachment of validAttachments) {
        await addAttachment(ticketId, attachment.fileName.trim(), attachment.filePath.trim());
      }
    }

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: { ticketId },
    });
  } catch (err) {
    console.error('Create ticket error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create ticket',
    });
  }
};

/**
 * Get ticket details
 */
const getTicketDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { companyId, role } = req;

    const ticket = await getTicketById(ticketId, companyId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Get comments
    let comments = [];
    if (role === 'Engineer' || role === 'Manager') {
      comments = await getAllTicketComments(ticketId);
    } else {
      comments = await getTicketComments(ticketId, false);
    }

    // Get attachments
    const attachments = await getTicketAttachments(ticketId);

    // Add SLA countdown
    const slaCountdown = getSLACountdown(ticket.SLADeadline);

    res.status(200).json({
      success: true,
      data: {
        ...ticket,
        slaCountdown,
        slaDeadlineFormatted: formatDate(ticket.SLADeadline),
        comments,
        attachments,
      },
    });
  } catch (err) {
    console.error('Get ticket details error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get ticket details',
    });
  }
};

/**
 * Get tickets list based on user role
 */
const getTicketsList = async (req, res) => {
  try {
    const { companyId, role, userId } = req;
    const { status, priority } = req.query;

    let tickets = [];

    if (role === 'Client') {
      tickets = await getTicketsCreatedByUser(userId, companyId);
    } else if (role === 'Engineer') {
      tickets = await getTicketsAssignedToUser(userId, companyId);
    } else if (role === 'Manager') {
      // Managers see all tickets in company
      const filters = {};
      if (status) filters.statusId = status;
      if (priority) filters.priorityId = priority;
      tickets = await getTicketsByCompany(companyId, filters);
    }

    if (role !== 'Manager') {
      tickets = tickets.filter((ticket) => {
        const matchesStatus = status ? String(ticket.StatusID) === String(status) : true;
        const matchesPriority = priority ? String(ticket.PriorityID) === String(priority) : true;
        return matchesStatus && matchesPriority;
      });
    }

    // Add SLA countdown to each ticket
    const ticketsWithSLA = tickets.map((ticket) => ({
      ...ticket,
      slaCountdown: getSLACountdown(ticket.SLADeadline),
    }));

    res.status(200).json({
      success: true,
      data: ticketsWithSLA,
    });
  } catch (err) {
    console.error('Get tickets list error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
    });
  }
};

/**
 * Get overdue tickets
 */
const getOverdueList = async (req, res) => {
  try {
    const { companyId, role } = req;

    let overdueTickets = [];

    if (role === 'Manager') {
      overdueTickets = await getOverdueTickets(companyId);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view overdue tickets',
      });
    }

    const ticketsWithSLA = overdueTickets.map((ticket) => ({
      ...ticket,
      slaCountdown: getSLACountdown(ticket.SLADeadline),
    }));

    res.status(200).json({
      success: true,
      data: ticketsWithSLA,
    });
  } catch (err) {
    console.error('Get overdue tickets error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue tickets',
    });
  }
};

/**
 * Update ticket status
 */
const updateStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { statusId } = req.body;
    const { companyId, role } = req;

    if (!statusId) {
      return res.status(400).json({
        success: false,
        message: 'Status ID is required',
      });
    }

    // Verify ticket belongs to user's company
    const ticket = await getTicketById(ticketId, companyId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Only Engineer and Manager can update status
    if (role !== 'Engineer' && role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const success = await updateTicketStatus(ticketId, statusId);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to update ticket status',
      });
    }

    // Trigger resolution email if status is Resolved (4) or Closed (5)
    // Adjust status IDs based on your Status table
    if ([4, 5].includes(statusId)) {
      const { notifyTicketResolved } = require('../services/notificationService');
      notifyTicketResolved(ticketId).catch(err => {
        console.error('⚠️ Resolution email warning:', err.message);
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully',
    });
  } catch (err) {
    console.error('Update ticket status error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update ticket status',
    });
  }
};

/**
 * Assign ticket to engineer
 */
const assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { engineerId } = req.body;
    const { companyId, role } = req;

    if (!engineerId) {
      return res.status(400).json({
        success: false,
        message: 'Engineer ID is required',
      });
    }

    // Only Manager can assign
    if (role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can assign tickets',
      });
    }

    // Verify ticket
    const ticket = await getTicketById(ticketId, companyId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    const success = await assignTicketToEngineer(ticketId, engineerId);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to assign ticket',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
    });
  } catch (err) {
    console.error('Assign ticket error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to assign ticket',
    });
  }
};

/**
 * Add comment to ticket
 */
const addTicketComment = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { commentText } = req.body;
    const { userId, companyId } = req;

    if (!commentText) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required',
      });
    }

    // Verify ticket
    const ticket = await getTicketById(ticketId, companyId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    const success = await addComment(ticketId, userId, commentText, false);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to add comment',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
    });
  } catch (err) {
    console.error('Add comment error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
    });
  }
};

/**
 * Validation rules for creating ticket
 */
const createTicketValidationRules = () => {
  return [
    body('title').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('priorityId').isNumeric(),
    body('attachments').optional().isArray(),
    body('attachments.*.fileName').optional().isString().trim(),
    body('attachments.*.filePath').optional().isString().trim(),
  ];
};

module.exports = {
  createNewTicket,
  getTicketDetails,
  getTicketsList,
  getOverdueList,
  updateStatus,
  assignTicket,
  addTicketComment,
  createTicketValidationRules,
};
