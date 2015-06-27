# grunt-ssg

> Compile views to static HTML using [Static Site Generator (SSG)](https://github.com/Feedient/Static-site-generator)



## Getting Started
This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-ssg --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-ssg');
```

### Options

#### path
Type: `String`  
Default: same directory as `Gruntfile.js`

Path to where the view files are located.

#### config
Type: `String`

Path to a valid SSG JSON manifest

### Usage Examples
```js
ssg: {
	dev: {
		config: 'config/ssg_dev.json'			
	},

	stag: {
		config: 'config/ssg_stag.json'
	},

	prod: {
		config: 'config/ssg_prod.json'			
	}
}
```

### Register task
Run it as "dev" target.
```js
grunt.registerTask('default', ['ssg:dev']);
````
