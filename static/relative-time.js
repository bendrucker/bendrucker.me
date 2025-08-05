(function () {
  "use strict";

  function updateRelativeTime() {
    const timeElements = document.querySelectorAll("time[data-relative]");

    timeElements.forEach((timeEl) => {
      const datetime = timeEl.getAttribute("datetime");
      if (!datetime) return;

      const date = new Date(datetime);
      const now = new Date();
      const diffMs = now - date;

      // Convert to different units
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
      const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
      const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));

      const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

      let relativeTime;

      if (diffYears > 0) {
        relativeTime = rtf.format(-diffYears, "year");
      } else if (diffMonths > 0) {
        relativeTime = rtf.format(-diffMonths, "month");
      } else if (diffWeeks > 0) {
        relativeTime = rtf.format(-diffWeeks, "week");
      } else if (diffDays > 0) {
        relativeTime = rtf.format(-diffDays, "day");
      } else if (diffHours > 0) {
        relativeTime = rtf.format(-diffHours, "hour");
      } else if (diffMinutes > 0) {
        relativeTime = rtf.format(-diffMinutes, "minute");
      } else {
        relativeTime = rtf.format(-diffSeconds, "second");
      }

      timeEl.textContent = relativeTime;
    });
  }

  // Update on page load
  document.addEventListener("DOMContentLoaded", updateRelativeTime);

  // Update every minute for fresh relative times
  setInterval(updateRelativeTime, 60000);
})();
