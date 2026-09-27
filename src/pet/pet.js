
const { PetStats } = require('./stats.js');
const { Evolution, Devolution } = require('./evolution.js');

class Pet {
  constructor(name) {
    this.name = name;
    this.stats = new PetStats();
    this.skills = [];
    this.form = 'base';
    this.appearance = {};
    this.inventory = {};
    this.location = null;
    this.evolution = new Evolution(this);
    this.devolution = new Devolution(this);
  }

  configureEvolution(chain) {
    this.evolution.configureChain(chain);
  }

  hasItem(id, count = 1) {
    return (this.inventory[id] || 0) >= count;
  }

  addItem(id, count = 1) {
    this.inventory[id] = (this.inventory[id] || 0) + count;
    this.update();
  }

  consumeItem(id, count = 1) {
    if (!this.hasItem(id, count)) {
      throw new Error(`道具不足: ${id}`);
    }
    this.inventory[id] -= count;
  }

  setIntimacy(value) {
    this.stats.intimacy = value;
    this.update();
  }

  addIntimacy(value) {
    this.stats.intimacy += value;
    this.update();
  }

  setLocation(location) {
    this.location = location;
    this.update();
  }

  getLocation() {
    return this.location;
  }

  gainExp(amount) {
    this.stats.gainExp(amount);
    this.update();
  }

  levelUp() {
    this.stats.level++;
    this.update();
  }

  update() {
    this.checkEvolution();
  }

  checkEvolution() {
    return this.evolution.checkEvolution();
  }

  snapshot() {
    return {
      name: this.name,
      stats: this.stats.snapshot(),
      skills: this.skills.slice(),
      form: this.form,
      appearance: Object.assign({}, this.appearance),
      inventory: Object.assign({}, this.inventory),
      location: this.location,
    };
  }

  restore(snapshot) {
    this.name = snapshot.name;
    this.stats.restore(snapshot.stats);
    this.skills = snapshot.skills.slice();
    this.form = snapshot.form;
    this.appearance = Object.assign({}, snapshot.appearance);
    this.inventory = Object.assign({}, snapshot.inventory);
    this.location = snapshot.location;
  }
}

module.exports = { Pet };
