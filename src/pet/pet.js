

class Pet {
  constructor(name) { this.name=name; this.stats=new PetStats(); this.evolution=new Evolution(this); this.skills=[]; }
  update() { this.evolution.check(); }
}

module.exports = { Pet };
