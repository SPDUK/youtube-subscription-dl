const notifier = require('node-notifier');
// sends an OS notification and logs the same message to the console as a fallback
// has to be awkwardly formatted
function logAndNotify({ title, message }) {
  notifier.notify({
    title,
    message
  });
  console.log(`${title}
${message}
  `);
}

module.exports = logAndNotify;
