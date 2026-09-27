const { PetStats } = require('./stats.js');
const { Evolution } = require('./evolution.js');

class Pet {
  constructor(name) {
    this.name = name;
    this.stats = new PetStats();
    this.evolution = new Evolution(this);
    this.skills = [];
    this.items = [];
    this.environment = { time: 'day', location: 'home' };
    this.stats._evolutionHook = () => this.evolution.checkEvolution();
  }

  update() {
    this.evolution.checkEvolution();
  }

  gainExp(amount) {
    this.stats.gainExp(amount);
  }

  setIntimacy(value) {
    this.stats.intimacy = value;
    this.evolution.checkEvolution();
  }

  addItem(item) {
    if (!this.items.includes(item)) this.items.push(item);
    this.evolution.checkEvolution();
  }

  removeItem(item) {
    this.items = this.items.filter((i) => i !== item);
  }
}

module.exports = { Pet };
