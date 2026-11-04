/**
 * Parses raw User-Agent header into structured device metadata.
 * Extracts device type (desktop, mobile, tablet), OS, browser, and friendly name.
 * 
 * @param {string} [ua='']
 * @returns {{ device_name: string, device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown', os: string, browser: string }}
 */
export function parseUserAgent(ua = '') {
  if (!ua || typeof ua !== 'string') {
    return {
      device_name: 'Unknown Device',
      device_type: 'unknown',
      os: 'Unknown OS',
      browser: 'Unknown Browser',
    };
  }

  let device_type = 'desktop';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let model = '';

  // 1. Detect Device Type
  if (/iPad|Tablet/i.test(ua)) {
    device_type = 'tablet';
  } else if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    device_type = 'mobile';
  }

  // 2. Detect OS & Hardware Model
  if (/Windows NT 10\.0/i.test(ua)) {
    os = 'Windows 10/11';
  } else if (/Windows NT 6\.3/i.test(ua)) {
    os = 'Windows 8.1';
  } else if (/Windows NT 6\.1/i.test(ua)) {
    os = 'Windows 7';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s*([0-9.]+)?/i);
    os = match && match[1] ? `Android ${match[1]}` : 'Android';
    const modelMatch = ua.match(/;\s*([^;)]+)\s*Build/i);
    if (modelMatch && modelMatch[1]) {
      model = modelMatch[1].trim();
    }
  } else if (/iPhone/i.test(ua)) {
    const match = ua.match(/iPhone OS\s*([0-9_]+)?/i);
    os = match && match[1] ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
    model = 'iPhone';
  } else if (/iPad/i.test(ua)) {
    const match = ua.match(/OS\s*([0-9_]+)?/i);
    os = match && match[1] ? `iPadOS ${match[1].replace(/_/g, '.')}` : 'iPadOS';
    model = 'iPad';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    const match = ua.match(/Mac OS X\s*([0-9_]+)?/i);
    os = match && match[1] ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/CrOS/i.test(ua)) {
    os = 'ChromeOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // 3. Detect Browser
  if (/Edg\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Edg\/([0-9.]+)/i);
    browser = match ? `Edge ${match[1].split('.')[0]}` : 'Edge';
  } else if (/OPR\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/OPR\/([0-9.]+)/i);
    browser = match ? `Opera ${match[1].split('.')[0]}` : 'Opera';
  } else if (/Chrome\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9.]+)/i);
    const ver = match ? match[1].split('.')[0] : '';
    browser = device_type === 'mobile' ? `Chrome Mobile ${ver}`.trim() : `Chrome ${ver}`.trim();
  } else if (/Version\/([0-9.]+).*Safari/i.test(ua)) {
    const match = ua.match(/Version\/([0-9.]+)/i);
    const ver = match ? match[1].split('.')[0] : '';
    browser = `Safari ${ver}`.trim();
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/i);
    browser = match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox';
  }

  // 4. Construct friendly device name
  let device_name = '';
  if (model) {
    device_name = `${model} (${os})`;
  } else if (device_type === 'desktop') {
    device_name = `${os} (${browser})`;
  } else {
    device_name = `${os} Device (${browser})`;
  }

  return {
    device_name,
    device_type,
    os,
    browser,
  };
}

