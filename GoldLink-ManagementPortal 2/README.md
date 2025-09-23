Installation:

You will need to install Node (preferrably v19.2, but newer is fine too)

Install angular if it's not globally installed somewhere:

To do this, run a command prompt, CD to the directory, run:
npm install -g @angular/cli

Then to install node_modules (dependencies), run a command prompt, CD to the directory, then run:
npm install

To run the project in a browser, you may type:
ng serve --port 8080
npm run build  <-- will output the javascript files to directory/dist folder, in production mode as set

You may need to first run command if you encounter this:
$env:NODE_OPTIONS="--openssl-legacy-provider"

This project has its own login page so there is no need to hook up a landing page or other logins,
but the landing page shows an example how you may that and then redirect over.