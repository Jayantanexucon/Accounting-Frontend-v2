import {
  getJournalApprovalRequestsApi,
  requestJournalDeleteApprovalApi,
  requestJournalEditApprovalApi,
  updateJournalApprovalRequestApi,
} from "../apis/journalApi";

export const ApprovalManager = {
  matchesId: (left, right) => String(left) === String(right),

  // Get all approval requests
  getRequests: (companyId) => {
    try {
      const key = `approvals_${companyId}`;
      const requests = localStorage.getItem(key);
      // console.log(`Getting requests for ${companyId}:`, requests);
      return requests ? JSON.parse(requests) : [];
    } catch (error) {
      console.error("Error getting requests:", error);
      return [];
    }
  },

  // Save requests
  saveRequests: (companyId, requests) => {
    try {
      const key = `approvals_${companyId}`;
      //console.log(`Saving requests for ${companyId}:`, requests);
      localStorage.setItem(key, JSON.stringify(requests));
    } catch (error) {
      console.error("Error saving requests:", error);
    }
  },

  syncRequests: async (companyId) => {
    try {
      if (!companyId) return [];
      const response = await getJournalApprovalRequestsApi(companyId);
      const requests = response.data || [];
      ApprovalManager.saveRequests(companyId, requests);
      return requests;
    } catch (error) {
      console.error("Error syncing requests:", error);
      return ApprovalManager.getRequests(companyId);
    }
  },

  // Add delete request
  addDeleteRequest: async (companyId, journal) => {
    try {
      const response = await requestJournalDeleteApprovalApi(companyId, journal._id);
      await ApprovalManager.syncRequests(companyId);
      return response.data;
    } catch (error) {
      console.error("Error adding delete request:", error);
      throw error;
    }
  },

  // Add edit approval request
  addEditApproval: async (companyId, journal) => {
    try {
      const response = await requestJournalEditApprovalApi(companyId, journal._id);
      await ApprovalManager.syncRequests(companyId);
      return response.data;
    } catch (error) {
      console.error("Error adding edit request:", error);
      throw error;
    }
  },

  // Approve request
  approveRequest: async (companyId, requestId) => {
    try {
      const response = await updateJournalApprovalRequestApi(
        companyId,
        requestId,
        "approved",
      );
      await ApprovalManager.syncRequests(companyId);
      return response.data;
    } catch (error) {
      console.error("Error approving request:", error);
      throw error;
    }
  },

  // Reject request
  rejectRequest: async (companyId, requestId) => {
    try {
      await updateJournalApprovalRequestApi(companyId, requestId, "rejected");
      await ApprovalManager.syncRequests(companyId);
      // console.log("Request rejected:", requestId);
      return true;
    } catch (error) {
      console.error("Error rejecting request:", error);
      throw error;
    }
  },

  // Get pending requests count
  getPendingCount: (companyId) => {
    try {
      const requests = ApprovalManager.getRequests(companyId);
      const pending = requests.filter((r) => r.status === "pending");
      return pending.length;
    } catch (error) {
      console.error("Error getting pending count:", error);
      return 0;
    }
  },

  // Check if user can edit specific journal
  canUserEditJournal: (companyId, journalId, userId) => {
    try {
      const requests = ApprovalManager.getRequests(companyId);
      return requests.some(
        (r) =>
          r.type === "edit" &&
          ApprovalManager.matchesId(r.journalId, journalId) &&
          ApprovalManager.matchesId(r.requestedBy?._id || r.requestedBy?.id, userId) &&
          r.status === "approved",
      );
    } catch (error) {
      console.error("Error checking edit permission:", error);
      return false;
    }
  },

  // Check if journal has pending edit request (locked)
  isJournalLockedForEdit: (companyId, journalId) => {
    try {
      const requests = ApprovalManager.getRequests(companyId);
      return requests.some(
        (r) =>
          r.type === "edit" &&
          ApprovalManager.matchesId(r.journalId, journalId) &&
          r.status === "pending",
      );
    } catch (error) {
      console.error("Error checking journal lock:", error);
      return false;
    }
  },

  // Check if user has pending edit request for journal
  hasUserRequestedEdit: (companyId, journalId, userId) => {
    try {
      const requests = ApprovalManager.getRequests(companyId);
      return requests.some(
        (r) =>
          r.type === "edit" &&
          ApprovalManager.matchesId(r.journalId, journalId) &&
          ApprovalManager.matchesId(r.requestedBy?._id || r.requestedBy?.id, userId) &&
          r.status === "pending",
      );
    } catch (error) {
      console.error("Error checking user edit request:", error);
      return false;
    }
  },

  // Check if journal has pending delete request (locked)
  isJournalLockedForDelete: (companyId, journalId) => {
    try {
      const requests = ApprovalManager.getRequests(companyId);
      return requests.some(
        (r) =>
          r.type === "delete" &&
          ApprovalManager.matchesId(r.journalId, journalId) &&
          r.status === "pending",
      );
    } catch (error) {
      console.error("Error checking delete lock:", error);
      return false;
    }
  },

  // Check if current user already requested delete for this journal
  hasUserRequestedDelete: (companyId, journalId, userId) => {
    try {
      const requests = ApprovalManager.getRequests(companyId);
      return requests.some(
        (r) =>
          r.type === "delete" &&
          ApprovalManager.matchesId(r.journalId, journalId) &&
          ApprovalManager.matchesId(
            r.requestedBy?._id || r.requestedBy?.id,
            userId,
          ) &&
          r.status === "pending",
      );
    } catch (error) {
      console.error("Error checking user delete request:", error);
      return false;
    }
  },

  // Remove request after action
  removeRequest: (companyId, requestId) => {
    const requests = ApprovalManager.getRequests(companyId);
    const filtered = requests.filter((r) => r._id !== requestId);
    ApprovalManager.saveRequests(companyId, filtered);
    return true;
  },

  // Clear all approved requests for a journal when edited
  clearApprovedEditRequests: (companyId, journalId) => {
    const requests = ApprovalManager.getRequests(companyId);
    const filtered = requests.filter(
      (r) =>
        !(
          r.type === "edit" &&
          ApprovalManager.matchesId(r.journalId, journalId) &&
          r.status === "approved"
        ),
    );
    ApprovalManager.saveRequests(companyId, filtered);
    return true;
  },

  // Get all pending edit requests for a specific journal
  getPendingEditRequestsForJournal: (companyId, journalId) => {
    try {
      const requests = ApprovalManager.getRequests(companyId);
      return requests.filter(
        (r) =>
          r.type === "edit" &&
          ApprovalManager.matchesId(r.journalId, journalId) &&
          r.status === "pending",
      );
    } catch (error) {
      console.error("Error getting pending edit requests:", error);
      return [];
    }
  },
};
