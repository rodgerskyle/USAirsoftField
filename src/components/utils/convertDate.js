const convertDate = (date) => {
    // If date is a Date object, convert to string
    if (date instanceof Date) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // If date is a string, use existing logic
    if (typeof date === 'string') {
        const parts = date.split(' ');
        const datePart = parts[0];
        const timePart = parts[1];

        const [month, day, year] = datePart.split('/');
        const [hour, minute] = timePart.split(':');

        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        return `${months[parseInt(month) - 1]} ${day}, ${year} ${hour}:${minute}`;
    }

    // If neither Date nor string, return empty string
    return '';
};

export default convertDate;
