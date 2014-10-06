/**
 * Created by artzub on 06.10.2014.
 */

var text = "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eaque eveniet fugit nemo, placeat quod repellendus vero. Autem cumque placeat sapiente?".split(' ')
    , rawData = []
    , l = 1000
    , pl = 5
    , p, c
    , parents = []
    , ONE_STEP = 108e5
    , now = Date.now() - l*8*ONE_STEP
    ;

function rand(max, min) {
    min = min || 0;
    return Math.random() * (max - min) + min;
}

while(pl--) {
    parents.push({ name: text[Math.random() * (text.length - 1) | 0], key: pl});
}

c = text[Math.random() * (text.length - 1) | 0];
while(l--) {
    p = parents[rand(parents.length-1) | 0];
    c = !(l % 20) ? text[Math.random() * (text.length - 1) | 0] : c;
    rawData.push({
        key : l % (rand(50, 5) | 0),
        category : c,
        parent : p,
        date : new Date(now += ONE_STEP * rand(8, 2))
    })
}

console.log('var rawData = ' + JSON.stringify(rawData.sort(function (a, b) {
    return a.date - b.date;
}), null, 2));
