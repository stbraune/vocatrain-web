var fs = require('fs');
var path = require('path');
var uuid = require('uuid/v4');

function cut(line) {
  var parts = line.split('---').map(p => p.trim());
  return parts;
}

function gtext(line, tags) {
  var parts = cut(line);
  var bg = parts[0];
  var de = parts[1];
  parts.splice(0, 2);
  var meta = parts.join('\n');

  return {
    meta: meta,
    tags: tags,
    words: {
      'bg': { value: bg },
      'de': { value: de }
    }
  };
}

function getLines(s) {
  var date = new Date();
  var lines = s.replace(/\r\n\t;/g, '---').split('\r\n');
  console.log(lines.slice(111)[0]);
  var r = lines;
  var parts;

  var all = [];
  var cur;
  for (var line of lines) {
    line = line.trim();
    if (!line) { continue; }
    if (line.startsWith('=')) {
      if (cur) {
        all.push(cur);
      }

      var text = gtext(line.substring(1), ['assimil', 'text']);
      date.setTime(date.getTime() + 20000);
      cur = {
        _id: 'word_' + date.toISOString() + '_' + uuid(),
        texts: [
          text
        ],
        updatedAt: date,
        createdAt: date
      };
    } else if (line.startsWith('!')) {
      cur.texts.push(gtext(line.substring(1), ['heading', 'text']));
    } else if (line.startsWith('/')) {
      cur.texts.push(gtext(line.substring(1), ['ignore', 'text']));
    } else {
      cur.texts.push(gtext(line, ['text']));
    }
  }
  return JSON.stringify(all, null, 2);
}

var fname = path.join(__dirname, '..', 'texts.txt');
var fname2 = path.join(__dirname, '..', 'texts.json');
fs.readFile(fname, { encoding: 'utf-8' }, function (err, data) {
  if (!err) {
    var ls = getLines(data);
    fs.writeFile(fname2, ls, function(err2) {
      if (err) {
        console.error(err);
      } else {
        console.log('ok!');
      }
    });
    // console.log(ls);
  } else {
    console.error(err);
  }
});
