/**
 * locutus.js contains few functions from: https://locutus.io/
 * @since 2019-12-20
 */

exports.number_format = function number_format (number, decimals, decPoint, thousandsSep) { // eslint-disable-line camelcase
  //  discuss at: https://locutus.io/php/number_format/
  // original by: Jonas Raoni Soares Silva (https://www.jsfromhell.com)
  // improved by: Kevin van Zonneveld (https://kvz.io)
  // improved by: davook
  // improved by: Brett Zamir (https://brett-zamir.me)
  // improved by: Brett Zamir (https://brett-zamir.me)
  // improved by: Theriault (https://github.com/Theriault)
  // improved by: Kevin van Zonneveld (https://kvz.io)
  // bugfixed by: Michael White (https://getsprink.com)
  // bugfixed by: Benjamin Lupton
  // bugfixed by: Allan Jensen (https://www.winternet.no)
  // bugfixed by: Howard Yeend
  // bugfixed by: Diogo Resende
  // bugfixed by: Rival
  // bugfixed by: Brett Zamir (https://brett-zamir.me)
  //  revised by: Jonas Raoni Soares Silva (https://www.jsfromhell.com)
  //  revised by: Luke Smith (https://lucassmith.name)
  //    input by: Kheang Hok Chin (https://www.distantia.ca/)
  //    input by: Jay Klehr
  //    input by: Amir Habibi (https://www.residence-mixte.com/)
  //    input by: Amirouche
  //   example 1: number_format(1234.56)
  //   returns 1: '1,235'
  //   example 2: number_format(1234.56, 2, ',', ' ')
  //   returns 2: '1 234,56'
  //   example 3: number_format(1234.5678, 2, '.', '')
  //   returns 3: '1234.57'
  //   example 4: number_format(67, 2, ',', '.')
  //   returns 4: '67,00'
  //   example 5: number_format(1000)
  //   returns 5: '1,000'
  //   example 6: number_format(67.311, 2)
  //   returns 6: '67.31'
  //   example 7: number_format(1000.55, 1)
  //   returns 7: '1,000.6'
  //   example 8: number_format(67000, 5, ',', '.')
  //   returns 8: '67.000,00000'
  //   example 9: number_format(0.9, 0)
  //   returns 9: '1'
  //  example 10: number_format('1.20', 2)
  //  returns 10: '1.20'
  //  example 11: number_format('1.20', 4)
  //  returns 11: '1.2000'
  //  example 12: number_format('1.2000', 3)
  //  returns 12: '1.200'
  //  example 13: number_format('1 000,50', 2, '.', ' ')
  //  returns 13: '100 050.00'
  //  example 14: number_format(1e-8, 8, '.', '')
  //  returns 14: '0.00000001'
  number = (number + '').replace(/[^0-9+\-Ee.]/g, '')
  const n = !isFinite(+number) ? 0 : +number
  const prec = !isFinite(+decimals) ? 0 : Math.abs(decimals)
  const sep = (typeof thousandsSep === 'undefined') ? ',' : thousandsSep
  const dec = (typeof decPoint === 'undefined') ? '.' : decPoint
  let s = ''
  const toFixedFix = function (n, prec) {
    if (('' + n).indexOf('e') === -1) {
      return +(Math.round(n + 'e+' + prec) + 'e-' + prec)
    } else {
      const arr = ('' + n).split('e')
      let sig = ''
      if (+arr[1] + prec > 0) {
        sig = '+'
      }
      return (+(Math.round(+arr[0] + 'e' + sig + (+arr[1] + prec)) + 'e-' + prec)).toFixed(prec)
    }
  }
  // @todo: for IE parseFloat(0.55).toFixed(0) = 0;
  s = (prec ? toFixedFix(n, prec).toString() : '' + Math.round(n)).split('.')
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep)
  }
  if ((s[1] || '').length < prec) {
    s[1] = s[1] || ''
    s[1] += new Array(prec - s[1].length + 1).join('0')
  }
  return s.join(dec)
}

exports.ucfirst = function (str) {
	//  discuss at: https://locutus.io/php/ucfirst/
	// original by: Kevin van Zonneveld (https://kvz.io)
	// bugFixed by: Onno Marsman (https://twitter.com/onnomarsman)
	// improved by: Brett Zamir (https://brett-zamir.me)
	//   example 1: ucfirst('kevin van Zonneveld')
	//   returns 1: 'Kevin van Zonneveld'

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
	// bugFixed by: Onno Marsman (https://twitter.com/onnomarsman)
	// bugFixed by: Cetvertacov Alexandr (https://github.com/cetver)
	//    input by: James (https://www.james-bell.co.uk/)
	//   example 1: ucwords('kevin van Zonneveld')
	//   returns 1: 'Kevin Van Zonneveld'
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

exports.utf8_decode = function (strData) { // eslint-disable-line camelcase
	//  discuss at: https://locutus.io/php/utf8_decode/
	// original by: WebToolkit.info (https://www.webtoolkit.info/)
	//    input by: Aman Gupta
	//    input by: Brett Zamir (https://brett-zamir.me)
	// improved by: Kevin van Zonneveld (https://kvz.io)
	// improved by: Norman "zEh" Fuchs
	// bugFixed by: hitWork
	// bugFixed by: Onno Marsman (https://twitter.com/onnomarsman)
	// bugFixed by: Kevin van Zonneveld (https://kvz.io)
	// bugFixed by: kirilloid
	// bugFixed by: w35l3y (https://www.wesley.eti.br)
	//   example 1: utf8_decode('Kevin van Zonneveld')
	//   returns 1: 'Kevin van Zonneveld'

	var tmpArr = []
	var i = 0
	var c1 = 0
	var seqLen = 0

	strData += ''

	while (i < strData.length) {
		c1 = strData.charCodeAt(i) & 0xFF
		seqLen = 0

		// https://en.wikipedia.org/wiki/UTF-8#Codepage_layout
		if (c1 <= 0xBF) {
			c1 = (c1 & 0x7F)
			seqLen = 1
		} else if (c1 <= 0xDF) {
			c1 = (c1 & 0x1F)
			seqLen = 2
		} else if (c1 <= 0xEF) {
			c1 = (c1 & 0x0F)
			seqLen = 3
		} else {
			c1 = (c1 & 0x07)
			seqLen = 4
		}

		for (var ai = 1; ai < seqLen; ++ai) {
			c1 = ((c1 << 0x06) | (strData.charCodeAt(ai + i) & 0x3F))
		}

		if (seqLen === 4) {
			c1 -= 0x10000
			tmpArr.push(String.fromCharCode(0xD800 | ((c1 >> 10) & 0x3FF)))
			tmpArr.push(String.fromCharCode(0xDC00 | (c1 & 0x3FF)))
		} else {
			tmpArr.push(String.fromCharCode(c1))
		}

		i += seqLen
	}

	return tmpArr.join('')
}

// vim: noexpandtab
