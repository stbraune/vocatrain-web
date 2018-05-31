let fs = require('fs');
let glob = require('glob');

let getFiles = (filter) => {
  return new Promise(resolve => {
    glob(filter, (err, innerfiles) => {
      resolve(innerfiles.filter((f) => fs.statSync(f).isFile()));
    });
  });
}

let getAllFiles = (filters) => {
  var promises = [];
  for (var i = 0; i < filters.length; i++) {
    var promise = getFiles(filters[i]);
    promises.push(promise);
  }

  return Promise.all(promises).then(fileArrays => {
    var allFiles = [];

    for (var j = 0; j < fileArrays.length; j++) {
      var fileArray = fileArrays[j];
      allFiles = allFiles.concat(fileArray);
    }

    return allFiles;
  });
}

let writeFile = (fileName, content) => {
  return new Promise(resolve => {
    fs.writeFile(fileName, content, 'utf8', function (err) {
      if (err) return console.log(err);
      resolve();
    });
  });
}

getAllFiles(["./dist/*", "./dist/assets/**"]).then(files => {
  var content = `CACHE MANIFEST
# Date: ` + (new Date().toISOString()) + `
CACHE:
`;
  for (var k = 0; k < files.length; k++) {
    var fileName = files[k];
    content += fileName.replace("./dist/", "") + `
`;
  }

  content += `
NETWORK:
*`;

  writeFile("./dist/appcache.manifest", content);
});