/**
 * API Service Layer
 * Handles all HTTP requests to Express backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:3005';

// Allow self-signed certificates in development
if (typeof window === 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic POST request to backend API
 * Backend expects Angular's application/x-www-form-urlencoded format:
 * JSON data as a key in the body object
 */
export async function apiCall<T = any>(
  endpoint: string,
  data?: Record<string, any>
): Promise<ApiResponse<T>> {
  try {
    // Convert data to Angular's form-urlencoded format
    // Backend expects: JSON.parse(Object.keys(req.body)[0])
    const formData = new URLSearchParams();
    formData.append(JSON.stringify(data || {}), '');

    const response = await fetch(`${API_BASE}/bmapi${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error(`API call failed [${endpoint}]:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check authentication status
 */
export async function authCheck(checksum: string) {
  return apiCall('/AC', { checksum });
}

/**
 * Get group session data
 */
export async function getGroupSession(checksum: string) {
  return apiCall('/GGS', { checksum });
}

/**
 * Get user session info
 * Note: Backend expects "room" parameter, not "uuid"
 */
export async function getUserSession(checksum: string, uuid: string) {
  return apiCall('/GUS', { checksum, room: uuid });
}

/**
 * Save chat message (if backend supports it)
 * Note: Chat messages are primarily sent via Socket.io
 */
export async function saveChatMessage(
  checksum: string,
  roomId: string,
  message: string
) {
  return apiCall('/SCM', { checksum, room: roomId, message });
}

/**
 * Get client info details
 */
export async function getClientInfo(checksum: string, cid: number) {
  return apiCall('/GCID', { checksum, cid });
}

/**
 * Save session event
 */
export async function saveSessionEvent(
  checksum: string,
  uuid: string,
  event: string
) {
  return apiCall('/SCSE', { checksum, uuid, event });
}

/**
 * Get session chat history
 */
export async function getSessionChat(checksum: string, uuid: string) {
  return apiCall('/GSC', { checksum, uuid });
}

/**
 * Get therapist username
 */
export async function getTherapistUsername(checksum: string, uid: number) {
  return apiCall('/GTUN', { checksum, uid });
}

/**
 * Get client username
 */
export async function getClientUsername(checksum: string, cid: number) {
  return apiCall('/GCUN', { checksum, cid });
}

/**
 * Get client info by UUID
 */
export async function getClientByUUID(checksum: string, uuid: string) {
  return apiCall('/GCID', { checksum, id: uuid });
}

/**
 * Get user (therapist) info by checksum
 * Returns authenticated user's full profile
 */
export async function getUserInfo(checksum: string) {
  return apiCall('/GUD', { checksum });
}

// Add more API methods as needed based on backend endpoints...
