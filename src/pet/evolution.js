

class Evolution {
  constructor(pet) { this.pet = pet; this.conditions = []; this.log = []; }
  addCondition(stage, cond) { this.conditions.push({stage, cond}); }
  check() {
    // BUG: 只检查等级
    for (const c of this.conditions) {
      if (c.stage === this.pet.stats.evolutionStage + 1) {
        if (this.pet.stats.level >= c.cond.level) {
          this.evolve(c.stage);
          return true;
        }
      }
    }
    return false;
  }
  evolve(stage) {
    // BUG: 非原子，经验清零
    this.pet.stats.evolutionStage = stage;
    this.pet.stats.exp = 0;
    this.log.push({time: Date.now(), stage});
  }
}

module.exports = { Evolution };
