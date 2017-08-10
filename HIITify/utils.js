"use strict"
Number.prototype.toMMSS = function () {
    const sec_num = parseInt(this, 10); // don't forget the second param
    let minutes = Math.floor(sec_num / 60);
    let seconds = sec_num - (minutes * 60);

    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return minutes+':'+seconds;
}

Number.prototype.toSS = function () {
    const sec_num = parseInt(this, 10); // don't forget the second param
    let seconds = sec_num;
    if (seconds < 0) {seconds = 0;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return seconds;
}

// Array shuffling prototype
Array.prototype.shuffle = function(){
    let counter = this.length, temp, index;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        index = (Math.random() * counter--) | 0;

        // And swap the last element with it
        temp = this[counter];
        this[counter] = this[index];
        this[index] = temp;
    }
};
