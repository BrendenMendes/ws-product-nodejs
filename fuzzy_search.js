const Fuse = require('fuse.js')

module.exports=(data, query) => {
	const fuse = new Fuse(data, { keys : ["name"] });
	return fuse.search(query)
}