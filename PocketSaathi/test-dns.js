const fs = require('fs');

async function checkRegion() {
  const ip = '2406:da1c:61c:d601:8c2b:8859:873c:16b7';
  console.log('Fetching AWS IP ranges...');
  
  try {
    const res = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
    const data = await res.json();
    console.log(`Loaded ${data.ipv6_prefixes.length} IPv6 prefixes.`);
    
    // We convert IPv6 string to BigInt to perform subnet math
    function ipToBigInt(ipStr) {
      // expand collapsed double-colon ::
      let fullIp = ipStr;
      if (ipStr.includes('::')) {
        const parts = ipStr.split('::');
        const leftCount = parts[0] ? parts[0].split(':').length : 0;
        const rightCount = parts[1] ? parts[1].split(':').length : 0;
        const missing = 8 - (leftCount + rightCount);
        const middle = Array(missing).fill('0000').join(':');
        fullIp = (parts[0] || '0000') + ':' + middle + ':' + (parts[1] || '0000');
      }
      
      const segments = fullIp.split(':').map(s => {
        if (!s) return 0n;
        return BigInt(parseInt(s, 16));
      });
      
      let result = 0n;
      for (const segment of segments) {
        result = (result << 16n) + segment;
      }
      return result;
    }
    
    console.log("Searching for prefixes containing '2406:da1c'...");
    for (const prefix of data.ipv6_prefixes) {
      if (prefix.ipv6_prefix.toLowerCase().startsWith('2406:da1c')) {
        console.log(`Match: ${prefix.ipv6_prefix} | Region: ${prefix.region} | Service: ${prefix.service}`);
      }
    }
    
    console.log('No exact match found in list.');
  } catch (err) {
    console.error('Error matching ranges:', err);
  }
}

checkRegion();
