
// For an RFC 1123 (HTTP header date) date
function formatDate(date) {
	return (date || new Date()).toGMTString()
}

// Translate size in bytes into a human easy format
// Example: 17314856 B into 17,31 MB
function humanSizeFormat(size) {
	var formats = ['B', 'kB', 'MB', 'GB', 'TB'], pos = 0;
	while (size >= 1000 && formats[pos + 1]) {
		size = Math.round(size / 10) / 100;
		++pos
	}
	return formatNumber(size) + ' ' + formats[pos]
}

// Translate standard javascript number format into
// the Portuguese one.
// Example: 17314856.4874 into 17.314.856,4874
function formatNumber(number) {
	return (number + '').replace('.', ',').replace(/(?<=\d)(\d{3})+(?=,|$)/, function(m){return '.' + formatNumber(m)})
}

// Export functions
module.exports = {
    formatDate: formatDate,
    humanSizeFormat: humanSizeFormat,
	formatNumber: formatNumber
}
