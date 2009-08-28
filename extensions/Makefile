# Copyright 2009 Google Inc.
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#      http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
DISTNAME=extensions
DIST=dist
TEST=test
DOCS=docs
DOCS_TEMPLATE=googlecode_wiki
# TLIB = toolkit lib dir
TLIB=${GEOJS}/lib
LIB=lib
GEOJS=${LIB}/third-party/geojs
LICENSE_HEADER_JS=lib/license-header.js
SRC=src
TMP=tmp
#COMPRESS=java -jar ${TLIB}/yuicompressor-2.4.2.jar
COMPRESS=java -classpath .:${TLIB}/rhino.jar \
  org.mozilla.javascript.tools.shell.Main ${TLIB}/packer.js
JSCOVERAGE=${LIB}/jscoverage
FIND_SRC_CLAUSES=-name \*.js -not -name \*.jscoverage.js
AWK_TEST_RANGE="/\/\*\*\*IGNORE_BEGIN\*\*\*\//,/\/\*\*\*IGNORE_END\*\*\*\//"

all: tests dist docs

dist: concat
# make sure the concat file isn't instrumented
	[[ ! -f ${TMP}/.instrumented ]]
	mkdir -p ${DIST}
# NOTE: this packages geojs with concat GEarthExtensions	
	cat ${GEOJS}/dist/geo.js > ${DIST}/${DISTNAME}.js
	echo >> ${DIST}/${DISTNAME}.js
	cat ${LICENSE_HEADER_JS} ${TMP}/concat.js >> ${DIST}/${DISTNAME}.js
	
	@#${COMPRESS} ${TMP}/concat.js -o ${TMP}/pack.js
	${COMPRESS} ${TMP}/concat.js ${TMP}/pack.js
	cat ${GEOJS}/dist/geo.pack.js > ${DIST}/${DISTNAME}.pack.js
	echo >> ${DIST}/${DISTNAME}.pack.js
	cat ${LICENSE_HEADER_JS} ${TMP}/pack.js >> ${DIST}/${DISTNAME}.pack.js
	@echo ------ GEarthExtensions: Dist files are ready.

lint:
	@echo ------ GEarthExtensions: Running JsLint...
	find ${SRC} -name \*.js -exec echo \; -exec echo {} \; \
		-exec java -classpath .:${TLIB}/rhino.jar \
		org.mozilla.javascript.tools.shell.Main ${TLIB}/jslint.js {} \;

tests: consolidatetests concat
	mkdir -p ${TEST}
	cp -rf ${TLIB}/test/* ${TEST}
	cp -rf ${LIB}/test/* ${TEST}
	cp ${GEOJS}/dist/geo.js ${TEST}
	cp ${TMP}/tests.js ${TEST}/${DISTNAME}.tests.js
	cp ${TMP}/concat.js ${TEST}/${DISTNAME}.js
	@echo ------ GEarthExtensions: Tests are ready. Run test/test-runner.html

coveragetests: consolidatetests instrument concat tests
	cp -rf ${TMP}/${SRC}/* ${TEST}
	@echo ------ GEarthExtensions: Covered tests are ready. \
		Open test/jscoverage.html?test/test-runner.html in a browser.

docs: concat
	java -classpath .:${TLIB}/rhino.jar \
		org.mozilla.javascript.tools.shell.Main \
		${TLIB}/jsdoc-toolkit/app/run.js -s \
		-t=${TLIB}/jsdoc-toolkit/templates/${DOCS_TEMPLATE}/ \
		-D="featuredPages:GEarthExtensions" \
		-D="srcRoot:earth-api-utility-library/source/browse/trunk/extensions/" \
		-d=${DOCS} ${SRC} -r -j=${TLIB}/jsdoc-toolkit/app/run.js
	@echo ------ GEarthExtensions: Docs are ready. Copy to wiki/ folder in SVN repository.

clean:
	rm -rf ${TMP}
# don't wipe out .svn/ in DIST dir
	touch ${DIST}/dummy.js
	rm ${DIST}/*.js
	rm -rf ${DOCS}
	rm -rf ${TEST}

# INTERNAL #####################################################################

concat: consolidatetests
	# strip license header while concatenating
	for f in `find ${TMP}/${SRC} ${FIND_SRC_CLAUSES} | sort`; do awk 'NR==1,/\/\*/{skp=1} /\*\//{if(skp==1){skp=0;next;}} {if(skp==1)next; else print}' "$$f"; done >> ${TMP}/concat.js

instrument:
	$(if $(wildcard ${JSCOVERAGE}),,$(error "jscoverage is missing. See the project Wiki."))
	mkdir -p ${TMP}/instrumented
	${JSCOVERAGE} ${TMP}/${SRC} ${TMP}/instrumented
	rm -rf ${TMP}/${SRC}
	mv ${TMP}/instrumented ${TMP}/src
	touch ${TMP}/.instrumented

consolidatetests:
	rm -rf ${TMP}
	mkdir -p ${TMP}
	echo > ${TMP}/tests.js
	cp -rf ${SRC} ${TMP}
	for f in `find ${SRC} ${FIND_SRC_CLAUSES} | sort`; do awk ${AWK_TEST_RANGE} "$$f"; done >> ${TMP}/tests.js
	for f in `find ${SRC} ${FIND_SRC_CLAUSES} | sort`; do awk ${AWK_TEST_RANGE}"{next} {print}" "$$f" > ${TMP}/"$$f"; done
