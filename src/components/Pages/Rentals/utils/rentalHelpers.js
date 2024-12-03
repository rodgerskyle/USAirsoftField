export const returnDay = (day) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
};

export const returnMonth = (month) => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
};

export const calcTotal = (options) => {
    return options.reduce((total, option) => {
        return total + (option.amount * option.cost);
    }, 0).toFixed(2);
}; 