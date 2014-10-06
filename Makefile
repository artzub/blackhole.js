GENERATED_FILES = \
	blackhole.js \
	blackhole.min.js

all: $(GENERATED_FILES)

full: clean blackhole.js blackhole.min.js

blackhole.js: $(sh node_modules/.bin/smash --ignore-missing --list src/blackhole.js)
	rm -f $@
	"node_modules/.bin/smash" src/blackhole.js | "node_modules/.bin/uglifyjs" - --comments -b indent-level=4 -o $@
	chmod 777 $@

blackhole.min.js: blackhole.js
	rm -f $@
	node bin/uglify $< > $@

clean:
	rm -f -- $(GENERATED_FILES)