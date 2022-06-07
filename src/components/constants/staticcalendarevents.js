// staticcalendarevents.js

// New Years Day
// Presidents' Day
// Memorial Day
// 4th of July
// Labor Day
// Columbus Day
// Veterans' Day
// Friday after Thanksgiving Day
// Day after Christmas

// Closed days
// Christmas Day, Thanksgiving Day, & Easter Sunday

// Pass in year and grab the date
function easterDate(y) {
    y = Math.floor( y );
	var c = Math.floor( y / 100 );
	var n = y - 19 * Math.floor( y / 19 );
	var k = Math.floor( ( c - 17 ) / 25 );
	var i = c - Math.floor( c / 4 ) - Math.floor( ( c - k ) / 3 ) + 19 * n + 15;
	i = i - 30 * Math.floor( i / 30 );
	i = i - Math.floor( i / 28 ) * ( 1 - Math.floor( i / 28 ) * Math.floor( 29 / ( i + 1 ) ) * Math.floor( ( 21 - n ) / 11 ) );
	var j = y + Math.floor( y / 4 ) + i + 2 - c + Math.floor( c / 4 );
	j = j - 7 * Math.floor( j / 7 );
	var l = i - j;
	var m = 3 + Math.floor( ( l + 40 ) / 44 );
	var d = l + 28 - 31 * Math.floor( m / 4 );
	var z = new Date();
	z.setFullYear( y, m-1, d );
	return z;
}

const thanksgivingday = 22 + ((11 - (new Date(new Date().getFullYear(), 10, 1)).getDay()) % 7);
const thanksgiving = {
    date: new Date(new Date().getFullYear(), 10, thanksgivingday).toJSON(),
    name: "Thanksgiving Day Closed",
    time: "All Day",
    additional: "",
    static: true,
    reoccuring: false, // False because year is calculated in formula
}

const christmas = { 
    date: new Date(new Date().getFullYear(), 11, 25).toJSON(),
    name: "Christmas Day Closed",
    time: "All Day",
    additional: "",
    static: true,
    reoccuring: false, // False because year is calculated in formula
}

const easter = { 
    date: easterDate(new Date().getFullYear()).toJSON(),
    name: "Easter Sunday Closed",
    time: "All Day",
    additional: "",
    static: true,
    reoccuring: false, // False because year is calculated in formula
};

let array = [
    christmas,
    thanksgiving,
    easter
]

export default array