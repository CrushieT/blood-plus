(function () {
  const card = document.getElementById('confirmation-card');
  const pillText = document.getElementById('confirmation-pill-text');
  const spinner = document.getElementById('confirmation-spinner');
  const heading = document.getElementById('confirmation-heading');
  const subtext = document.getElementById('confirmation-subtext');
  const statusIcon = document.getElementById('status-icon');
  const statusTitle = document.getElementById('status-title');
  const statusCopy = document.getElementById('status-copy');
  const requestedAction = document.getElementById('requested-action');
  const resultNote = document.getElementById('result-note');

  function setState(state) {
    card.classList.remove('state-success', 'state-error');
    if (state === 'success') {
      card.classList.add('state-success');
    } else if (state === 'error') {
      card.classList.add('state-error');
    }
  }

  function setPending(actionLabel) {
    setState('pending');
    pillText.textContent = 'Processing response';
    spinner.style.display = 'inline-block';
    heading.textContent = 'Recording your confirmation';
    subtext.textContent = 'Your secure response is being validated and saved to the blood bank request workflow.';
    statusIcon.textContent = '...';
    statusTitle.textContent = 'Please wait';
    statusCopy.textContent = 'Do not close this page until the confirmation finishes.';
    requestedAction.textContent = actionLabel;
  }

  function setSuccess(accepted, serverMessage) {
    setState('success');
    pillText.textContent = accepted ? 'Accepted' : 'Rejected';
    spinner.style.display = 'none';
    heading.textContent = accepted ? 'Confirmation received' : 'Rejection received';
    subtext.textContent = accepted
      ? 'Your acceptance was recorded successfully. The blood bank can continue processing the approved request.'
      : 'Your rejection was recorded successfully. The request has been marked as rejected.';
    statusIcon.textContent = accepted ? 'OK' : 'NO';
    statusTitle.textContent = accepted
      ? 'Updated request accepted'
      : 'Updated request rejected';
    statusCopy.textContent = serverMessage;
    resultNote.textContent = accepted
      ? 'If you need another update later, the blood bank will send a new confirmation email when required.'
      : 'If this was not your intended response, please contact the blood bank immediately so the team can review the request with you.';
  }

  function setError(message) {
    setState('error');
    pillText.textContent = 'Link unavailable';
    spinner.style.display = 'none';
    heading.textContent = 'This confirmation link cannot be used';
    subtext.textContent = 'The confirmation token is invalid, expired, or was already completed.';
    statusIcon.textContent = '!';
    statusTitle.textContent = 'Unable to process confirmation';
    statusCopy.textContent = message;
    resultNote.textContent = 'Please contact the blood bank so a staff member can review the request and send a new confirmation if needed.';
    requestedAction.textContent = 'Unavailable';
  }

  async function run() {
    const params = new URLSearchParams(window.location.search);
    const token = (params.get('token') || '').trim();
    const action = (params.get('action') || '').trim().toLowerCase();
    const accepted = action === 'accept' ? true : action === 'reject' ? false : null;
    const actionLabel = accepted === null
      ? 'Unknown'
      : accepted
        ? 'Proceed / Accept'
        : 'Reject / Cancel';

    requestedAction.textContent = actionLabel;

    if (!token || accepted === null) {
      setError('This confirmation link is invalid or expired. Please contact the blood bank.');
      return;
    }

    setPending(actionLabel);

    try {
      const response = await fetch('/api/blood-requests/confirm-remarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          accepted
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'This confirmation link is invalid or expired. Please contact the blood bank.');
      }

      setSuccess(accepted, data.message || (
        accepted
          ? 'Thank you. You accepted the updated blood request terms. The blood bank may now proceed.'
          : 'You rejected the updated blood request terms. The request has been marked as rejected.'
      ));
    } catch (error) {
      setError(error.message || 'This confirmation link is invalid or expired. Please contact the blood bank.');
    }
  }

  run();
})();
