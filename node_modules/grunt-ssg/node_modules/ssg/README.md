Static Site Generator ("SSG")
=====================

Simple command line utility that compiles dynamic EJS view files into static HTML, based on a manifest file in the target directory.

[See example for reference.](https://github.com/jesperlindstrom/Static-site-generator/tree/master/example)


### Installation
Install SSG from [npm](http://npmjs.org):

	npm install ssg -g

### Usage 
The command syntax is:

	ssg {path} {environment}
	
The environment argument is optional and defaults to "dev". The command will look for a config file named `ssg_{environment}.json`.

To compile the current folder as "dev" environment, just run:

	ssg .

The above command will use `ssg_dev.json`.

### Explanation of the SSG manifest
#### `config`
Contains global data, sent to all views. Accessed via `<%= config.myConfigProperty %>` in your EJS views.

#### `views`
Contains an array of your view files and their individual settings.

##### -> `input`
The EJS source file.

##### -> `output` 
The HTML file the compiled EJS should be saved to.

##### -> `data`
Optional object of key/value data that is sent to the view. Accessed via `<%= myProperty %>` in your EJS views.

```json
{
	"config": {
		"root_url": "http://127.0.0.1/",
		"title": "Development site"
	},

	"views": [
		{
			"input": "index.ejs",
			"output": "index.html",
			"data": {
				"headline": "Welcome to my site",
				"content": "This is an example message."
			}
		},

		{
			"input": "about.ejs",
			"output": "about.html"
		}
	]
}
```

### Node.js API
You can run SSG from Node.js, using the following code.

```javascript
var ssg = require('ssg');

ssg('path/to/files', {
	config: { ... },
	views: [
		input: 'index.ejs',
		output: 'index.html',
		data: { ... }
	]
});