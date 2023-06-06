const csv = require('csv-parser')
const fs = require('fs')
const _ = require('lodash');

/**
 * input csv file download from 
 * https://www.amar.org.ir/%D8%A7%D8%B1%D8%AA%D8%A8%D8%A7%D8%B7-%D8%A8%D8%A7-%D9%85%D8%A7/%D8%AA%D9%82%D8%B3%DB%8C%D9%85%D8%A7%D8%AA-%DA%A9%D8%B4%D9%88%D8%B1%DB%8C
 */
let input = '../assets/GEO1400.csv';
/**
 * output files
 */
let destCSV = '../dest/states.csv';
let destJson = '../dest/states.json';
/**
 * define variables
 */
let id = 1;
let results = [];
let finalText = "";
let jsonObj = [];
let header = "id,code,type,name,fa_name,parent_id,parent_code,country_code"
/**
 * lang file
 */
let langs = require('../assets/langs.json');
langs = _.invert(langs)

start();

async function start() {
	/**
	 * add header and Iran country
	 */
	finalText += header + "\n";
	await addRow(`${id},IR,1,Iran,ایران,,,`);

	/**
	 * parse csv file
	 */
	await fs.createReadStream(input)
		.pipe(csv())
		.on('data', function (data) {
			if (data.BLKABD == '') {
				results.push(data)
			}
		})
		.on('end', () => {
			results = _.groupBy(results, 'OSTAN');
			/**
			 * add state/province
			 */
			_.map(results, async (item, key) => {
				id++
				let ostanId = id;
				let ostan = _.find(item, function (o) { return o.SHAHRESTAN == ''; });
				let name = fix(ostan.Ostan_name)
				addRow(`${id},IR${ostan.OSTAN},2,${langs[name]},${name},1,IR,IR`);
				let counties = _.filter(item, 'SHAHRESTAN');	``
				/**
				 * add county
				 */
				counties = _.groupBy(item, 'SHAHRESTAN');
				await _.map(counties, async (item, key) => {
					id++
					let countyId = id;
					let county = _.find(item, function (o) { return o.BAKHSH == ''; });
					let name = fix(county.Shahrestan_name)
					addRow(`${id},IR${county.OSTAN}${county.SHAHRESTAN},3,${langs[name]},${name},${ostanId},IR${county.OSTAN},IR`);

					parts = _.groupBy(_.filter(item, 'BAKHSH'), 'BAKHSH');
					await _.forEach(parts, async (item, key) => {
						id++
						let partId = id;
						let part = _.find(item, function (o) { return o.SHRDEH == '' });
						let name = fix(part.Bakhsh_name)
						addRow(`${id},IR${part.OSTAN}${part.SHAHRESTAN}${part.BAKHSH},4,${langs[name]||''},${name},${countyId},IR${county.OSTAN}${county.SHAHRESTAN},IR`);
	
						cities = _.groupBy(_.filter(item, 'SHRDEH'), 'SHRDEH');
						await _.forEach(cities, async (item, key) => {
							id++
							// let partId = id;
							let city = _.find(item, function (o) { return o.BLKABD == '' });
							let name = fix(city['Dehestan/Shahr_name'])
							addRow(`${id},IR${city.OSTAN}${city.SHAHRESTAN}${city.BAKHSH}${city.SHRDEH},5,${langs[name]||''},${name},${partId},IR${county.OSTAN}${county.SHAHRESTAN}${city.BAKHSH},IR`);
						})
					})
				})
			})
			writeToFile()
		});
}

/**
 * add each row to objects
 */
function addRow(text) {
	finalText += text + "\n";
	let combined = _.split(header,',').reduce((obj, key, index) => ({ ...obj, [key]: _.split(text,',')[index] }), {});
	jsonObj.push(combined)
}

/**
 * create output files
 */
function writeToFile() {
	fs.writeFile(destCSV, finalText, (err) => {
		if (err) throw err;
	})

	fs.writeFile(destJson, JSON.stringify(jsonObj), (err) => {
		if (err) throw err;
	})
}


/**
 * fix some misspelling
 */
function fix(text) {
	text = text.replaceAll(/[يی]/g, 'ی');
	text = text.replaceAll(/[کك]/g, 'ک');
	text = text.replaceAll(/ئ$/g, 'ی');
	text = text.replaceAll(/ئ /g, 'ی ');
	text = text.replaceAll('اسلام آبادغرب', 'اسلام‌آباد غرب');
	text = text.replaceAll('شاهین شهرومیمه', 'شاهین‌شهر و میمه');
	text = text.replaceAll('آران وبیدگل', 'آران و بیدگل');
	text = text.replaceAll('تیران وکرون', 'تیران و کرون');
	text = text.replaceAll('بو یین و میاندشت', 'بویین و میاندشت');
	text = text.replaceAll('سیستان وبلوچستان', 'سیستان و بلوچستان');
	text = text.replaceAll('چاه بهار', 'چابهار');
	text = text.replaceAll('نیک شهر', 'نیک‌شهر');
	text = text.replaceAll('چهارمحال وبختیاری', 'چهارمحال‌وبختیاری');
	text = text.replaceAll('دره شهر', 'دره‌شهر');
	text = text.replaceAll('کهگیلویه وبویراحمد', 'کهگیلویه و بویراحمد');
	text = text.replaceAll('حاجی اباد', 'حاجی‌آباد');
	text = text.replaceAll('رباط کریم', 'رباط‌کریم');
	text = text.replaceAll('مشگین شهر', 'مشگین‌شهر');
	text = text.replaceAll('مانه وسملقان', 'مانه و سملقان');

	return text;
}