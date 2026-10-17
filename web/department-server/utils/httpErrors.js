'use strict';

/**
 * Send a failure response. Rule violations (FaceError / AttendanceError) carry their own status,
 * machine-readable `code` and a message that is safe to show to the user. Anything else is logged
 * and answered with a generic 500 so internal details never reach the client.
 */
function sendError(res, err, fallbackMessage = 'Something went wrong. Please try again.') {
  if (err && (err.name === 'FaceError' || err.name === 'AttendanceError')) {
    return res.status(err.status).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.extra || {}),
    });
  }
  console.error(err);
  return res.status(500).json({ success: false, error: fallbackMessage });
}

module.exports = { sendError };
