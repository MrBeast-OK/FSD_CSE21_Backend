const EventEmitter = require('events');
class Button extends EventEmitter {
    click() {
        console.log('Button clicked');
        this.emit('click');
    }
    mouseover() {
        console.log('Mouse over button');
        this.emit('mouseover');
    }
}

const button = new Button();
button.on('click', () => {
    console.log('Click event handler');
});

button.on('mouseover', () => {
    console.log('Mouseover event handler');
});

button.click();
button.mouseover();