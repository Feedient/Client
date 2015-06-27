## Notice
**The Feedient repositories (Feedient/Client, Feedient/Server & Feedient/Vagrant) are the remnants of the feedient.com service which shut down on March 30th, 2015. No guarantees are given for any functionality – the features rely on third party API's from the social networks, which may have changed. There are various places where API tokens need to be filled in, for the web app to work.**

**As we do not have any plan of re-opening, and the project was just gathering dust, we decided to release all code and assets to the public. We do not have any intention of maintaining the repositories – they serve mainly as historic evidence. Feel free to use any code or design in any way you wish.**

*Original private repository readme follows below:*
–––

![Feedient](http://i44.tinypic.com/350o5y8.png)
#### Client side

## Prerequisites
- Feedient's [Vagrant box](https://github.com/thebillkidy/Feedient-Vagrant) installed.
- Grunt CLI installed in the Vagrant box or your own computer `npm install -g grunt-cli`

## Installation 
1. Clone this repository as `feedient.com` to the `www` directory in your Vagrant folder, using `git clone git@github.com:thebillkidy/Feedient-Client.git feedient.com`
2. Start Vagrant: `$ vagrant up local.feedient.com`
3. SSH into Vagrant `$ vagrant ssh local.feedient.com`
4. Run `$ sudo service nginx restart` to start the web server
5. Run `$ sudo supervisorctl start api_server` to start the [Feedient server](https://github.com/thebillkidy/Feedient-Server).
6. Install Gruntfile.js' dependencies: `$ npm install`
7. Run from Vagrant or your own computer (depending on where you installed it): `$ grunt`
8. Get your ass off the couch and start coding. :pig:

## Zeus Framework
Our in-house client side framework is called Zeus. More information can be found in [it's own repository](https://github.com/Feedient/Zeus/).
