const { query } = require('../config/database');

/**
 * Get next engineer using WORKLOAD-AWARE assignment for a company
 * 
 * Algorithm:
 * 1. Get all active engineers for company
 * 2. Count OPEN tickets for each engineer (Status != 'Resolved')
 * 3. Sort by workload (ascending - least busy first)
 * 4. On tie, use round-robin as tiebreaker
 * 5. Return engineer with LEAST open tickets
 * 
 * Benefits:
 * - Fair workload distribution
 * - No engineer overloaded with unresolved tickets
 * - System self-balances
 * 
 * @param {number} companyId - Company ID
 * @returns {object|null} { UserID, Name, Email, OpenTicketCount } or null if error
 */
const getNextEngineer = async (companyId) => {
  try {
    console.log(`🔄 [Workload] Getting least busy engineer for company ${companyId}...`);

    // Step 1: Get all active engineers for this company
    const engineersResult = await query(
      `SELECT UserID, Name, Email FROM Users 
       WHERE Role = 'Engineer' AND CompanyID = ? AND IsDeleted = 0
       ORDER BY UserID ASC`,
      [companyId]
    );

    if (!engineersResult[0] || engineersResult[0].length === 0) {
      console.log(`❌ [Workload] No active engineers found for company ${companyId}`);
      return null;
    }

    const engineers = engineersResult[0];
    console.log(`🔄 [Workload] Pool: ${engineers.length} active engineers`);
    console.log(`   Engineers: ${engineers.map(e => `${e.Name}(${e.UserID})`).join(', ')}`);

    // Step 2: Count open tickets for each engineer
    const engineersWithWorkload = await Promise.all(
      engineers.map(async (engineer) => {
        const ticketCountResult = await query(
          `SELECT COUNT(*) as OpenCount FROM Tickets t
           JOIN Status s ON t.StatusID = s.StatusID
           WHERE t.AssignedTo = ? AND LOWER(TRIM(s.Name)) NOT IN ('resolved', 'closed') AND IFNULL(t.IsDeleted, 0) = 0`,
          [engineer.UserID]
        );

        const openCount = ticketCountResult[0][0]?.OpenCount || 0;
        return {
          UserID: engineer.UserID,
          Name: engineer.Name,
          Email: engineer.Email,
          OpenTicketCount: openCount
        };
      })
    );

    // Step 3: Log workload distribution
    console.log(`📊 [Workload] Current distribution:`);
    engineersWithWorkload.forEach(e => {
      console.log(`   ${e.Name}: ${e.OpenTicketCount} open tickets`);
    });

    // Step 4: Get round-robin pointer for tiebreaker
    const assignmentResult = await query(
      `SELECT AssignmentID, LastAssignedEngineerID FROM EngineerAssignment 
       WHERE CompanyID = ?`,
      [companyId]
    );

    let lastEngineerID = null;
    let assignmentId = null;

    if (assignmentResult[0] && assignmentResult[0][0]) {
      assignmentId = assignmentResult[0][0].AssignmentID;
      lastEngineerID = assignmentResult[0][0].LastAssignedEngineerID;
    }

    // Step 5: Sort by workload (least busy first)
    // If tie, prioritize based on round-robin (next-in-rotation first)
    const sortedEngineers = engineersWithWorkload.sort((a, b) => {
      // Primary: Lower workload wins - THE MOST IMPORTANT!
      const workloadDiff = a.OpenTicketCount - b.OpenTicketCount;
      if (Math.abs(workloadDiff) > 0) {
        // If difference is 1 or more, this matters A LOT
        return workloadDiff;
      }

      // Only if EXACTLY same workload, use round-robin tiebreaker
      // Find the next in rotation after lastEngineerID
      if (lastEngineerID) {
        // Get the engineer IDs in sorted order to establish rotation
        const engineerIds = engineersWithWorkload.map(e => e.UserID).sort((x, y) => x - y);
        const lastIndex = engineerIds.indexOf(lastEngineerID);
        
        // Calculate next index in round if we have a last assignment
        const nextIndexInRotation = (lastIndex + 1) % engineerIds.length;
        const nextEngineerIdInRotation = engineerIds[nextIndexInRotation];
        
        // Prefer the one that's next in rotation
        if (a.UserID === nextEngineerIdInRotation) return -1; // a comes first
        if (b.UserID === nextEngineerIdInRotation) return 1;  // b comes first
      }

      // Default: sort by UserID
      return a.UserID - b.UserID;
    });

    // Step 6: Select engineer with least work
    const selectedEngineer = sortedEngineers[0];
    console.log(`✅ [Workload] Selected: ${selectedEngineer.Name} (ID: ${selectedEngineer.UserID}) with ${selectedEngineer.OpenTicketCount} open tickets`);

    // Step 7: Update round-robin pointer for next assignment
    if (assignmentId) {
      await query(
        `UPDATE EngineerAssignment 
         SET LastAssignedEngineerID = ?, 
             LastAssignmentAt = NOW(), 
             TotalAssignmentsInRotation = TotalAssignmentsInRotation + 1
         WHERE AssignmentID = ?`,
        [selectedEngineer.UserID, assignmentId]
      );
      console.log(`✅ [Workload] Pointer updated for next assignment`);
    }

    // Return without OpenTicketCount for backward compatibility
    return {
      UserID: selectedEngineer.UserID,
      Name: selectedEngineer.Name,
      Email: selectedEngineer.Email
    };

  } catch (error) {
    console.error(`❌ [Workload] Error: ${error.message}`);
    return null;
  }
};

module.exports = { getNextEngineer };
