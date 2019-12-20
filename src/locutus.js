/**
 * locutus.js contains few functions from: https://locutus.io/
 * @since 2019-12-20
 */

// jshint esversion: 8

exports.ucfirst = function (str) {
	//	discuss at: https://locutus.io/php/ucfirst/
	// original by: Kevin van Zonneveld (https://kvz.io)
	// bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
	// improved by: Brett Zamir (https://brett-zamir.me)
	//	 example 1: ucfirst('kevin van zonneveld')
	//	 returns 1: 'Kevin van zonneveld'

	str += ''
	var f = str.charAt(0).toUpperCase()

	return f + str.substr(1)
};

exports.ucwords = function (str) {
	//  discuss at: https://locutus.io/php/ucwords/
	// original by: Jonas Raoni Soares Silva (https://www.jsfromhell.com)
	// improved by: Waldo Malqui Silva (https://waldo.malqui.info)
	// improved by: Robin
	// improved by: Kevin van Zonneveld (https://kvz.io)
	// bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
	// bugfixed by: Cetvertacov Alexandr (https://github.com/cetver)
	//    input by: James (https://www.james-bell.co.uk/)
	//   example 1: ucwords('kevin van  zonneveld')
	//   returns 1: 'Kevin Van  Zonneveld'
	//   example 2: ucwords('HELLO WORLD')
	//   returns 2: 'HELLO WORLD'
	//   example 3: ucwords('у мэри был маленький ягненок и она его очень любила')
	//   returns 3: 'У Мэри Был Маленький Ягненок И Она Его Очень Любила'
	//   example 4: ucwords('τάχιστη αλώπηξ βαφής ψημένη γη, δρασκελίζει υπέρ νωθρού κυνός')
	//   returns 4: 'Τάχιστη Αλώπηξ Βαφής Ψημένη Γη, Δρασκελίζει Υπέρ Νωθρού Κυνός'

	return (str + '')
		.replace(/^(.)|\s+(.)/g, function ($1) {
			return $1.toUpperCase()
		})
};

// vim: noexpandtab shiftwidth=4 softtabstop=4 tabstop=4
