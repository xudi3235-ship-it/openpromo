(() => {
  window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    const event = params.get("event");
    const message = params.get("message");

    const payload = {
      source: "openpromo",
      payload: {
        status: status,
        event: event,
        message: message,
      },
    };
    const targetOrigin = window.location.origin;
    if (window.opener && typeof window.opener.postMessage === "function") {
      window.opener.postMessage(payload, targetOrigin);
      window.close();
    } else {
      // If opener is not available, instead of sending the result back to the client,
      // we will show the result message to the user and close the window after 5 seconds.
      let timeLeft = 5;
      let interval = null;
      const timeElement = document.createElement("p");
      document.body.appendChild(timeElement);

      function updateTime() {
        if (timeLeft === 0) {
          clearInterval(interval);
          window.close();
          return;
        }

        timeElement.innerHTML = `This window will close automatically in ${timeLeft} seconds.`;
        timeLeft--;
      }

      updateTime();
      interval = setInterval(updateTime, 1000);
    }
  });
})();
