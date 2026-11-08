// Utility function to format the date from Google Apps Script format
export const formatSensorDate = (dateString: string | undefined): string => {
  if (!dateString || dateString === 'N/A') return 'Unknown';
  
  // Handle different date formats
  let formattedDate: string;
  
  // Convert format from "2025-09-01_16:21:38" to "2025-09-01T16:21:38"
  if (dateString.includes('_')) {
    formattedDate = dateString.replace('_', 'T');
  } else {
    // If it's already in ISO format or another format, use as is
    formattedDate = dateString;
  }
  
  try {
    // First attempt: standard parsing
    let date = new Date(formattedDate);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      // Second attempt: try alternative format
      const parts = dateString.split(/[_\s\-:]/g).filter(Boolean);
      if (parts.length >= 6) {
        // Assuming format like YYYY-MM-DD_HH:MM:SS or similar
        const [year, month, day, hour, minute, second] = parts;
        date = new Date(
          parseInt(year), 
          parseInt(month) - 1, // Month is 0-indexed in JavaScript
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
        if (!isNaN(date.getTime())) {
          return formatTimeAgo(date);
        }
      }
      
      // Third attempt: try to parse as MM/DD/YYYY format
      if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          date = new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
          if (!isNaN(date.getTime())) {
            return formatTimeAgo(date);
          }
        }
      }
      
      console.error(`Failed to parse date: ${dateString}`);
      return 'Unknown'; // Return Unknown if all parsing fails
    }
    return formatTimeAgo(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown'; // Return Unknown if parsing fails
  }
};

// Helper function to format time in a user-friendly "X time ago" format
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Updated just now';
  } else if (diffMins < 60) {
    return `Updated ${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `Updated ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `Updated ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    // For older dates, return the formatted date
    return `Updated on ${date.toLocaleDateString()}`;
  }
};

/**
 * Parse raw Google Sheets timestamp into an IST Date (UTC+05:30).
 * Handles formats: "YYYY-MM-DD_HH:MM:SS", "YYYY-MM-DDTHH:MM:SS", ISO strings.
 */
export function parseISTDate(dateString: string | undefined): Date | null {
  if (!dateString || dateString === 'N/A' || dateString === 'Unknown') return null;

  const trimmed = dateString.trim();
  const parts = trimmed.split(/[_\s\-:T/]/g).filter(Boolean);

  if (parts.length >= 3) {
    let year = parts[0];
    const month = parts[1];
    let day = parts[2];
    const hour = parts[3] || '00';
    const minute = parts[4] || '00';
    const second = parts[5] || '00';

    // Handle DD/MM/YYYY
    if (year.length <= 2 && day.length === 4) {
      const temp = year;
      year = day;
      day = temp;
    }

    if (year.length === 4) {
      const isoWithOffset = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}+05:30`;
      const d = new Date(isoWithOffset);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Fallback to standard Date parsing
  const d = new Date(trimmed.replace('_', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

const istDayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const istMonthKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
});

const istShortDayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
});

const istFullDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const istShortMonthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  month: 'short',
});

const istMonthYearFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  month: 'short',
  year: '2-digit',
});

const istDayMonthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  month: 'short',
  day: 'numeric',
});

/**
 * Returns YYYY-MM-DD representing the IST calendar date.
 */
export function getISTDateKey(d: Date): string {
  return istDayKeyFormatter.format(d);
}

/**
 * Returns YYYY-MM representing the IST calendar month.
 */
export function getISTMonthKey(d: Date): string {
  return istMonthKeyFormatter.format(d);
}

/**
 * Returns formatted labels for a date in IST.
 */
export function formatISTLabels(d: Date): { short: string; full: string } {
  return {
    short: istShortDayFormatter.format(d),
    full: istFullDateFormatter.format(d),
  };
}

/**
 * Returns short month name (e.g. "Nov") in IST.
 */
export function formatISTMonthLabel(d: Date): string {
  return istShortMonthFormatter.format(d);
}

/**
 * Returns month and 2-digit year (e.g. "Nov '26") in IST.
 */
export function formatISTMonthYearLabel(d: Date): string {
  return istMonthYearFormatter.format(d);
}

/**
 * Returns day and short month (e.g. "15 Oct") in IST.
 */
export function formatISTDayMonthLabel(d: Date): string {
  return istDayMonthFormatter.format(d);
}

