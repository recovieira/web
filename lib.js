
function formatDate(date) {
	return (date || new Date()).toGMTString()
}

function humanSizeFormat(size) {
	var formats = ['B', 'kB', 'MB', 'GB', 'TB'], pos = 0;
	while (size >= 1000 && formats[pos + 1]) {
		size = Math.round(size / 10) / 100;
		++pos
	}
	return formatNumber(size) + ' ' + formats[pos]
}

function formatNumber(number) {
	return (number + '').replace('.', ',').replace(/(?<=\d)(\d{3})+(?=,|$)/, function(m){return '.' + formatNumber(m)})
}

module.exports = {
    formatDate: formatDate,
    humanSizeFormat: humanSizeFormat,
	formatNumber: formatNumber
}
