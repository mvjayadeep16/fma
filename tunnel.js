const localtunnel = require('localtunnel');

const PORT = process.env.PORT || 3000;
const SUBDOMAIN = process.env.SUBDOMAIN || 'flashman-srm';

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });
    console.log(`\n======================================================`);
    console.log(`🚀 FlashMan Public Live URL: ${tunnel.url}`);
    console.log(`======================================================\n`);

    tunnel.on('close', () => {
      console.log('Tunnel connection closed. Reconnecting in 3 seconds...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      tunnel.close();
    });
  } catch (err) {
    console.error('Failed to establish tunnel:', err.message);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
