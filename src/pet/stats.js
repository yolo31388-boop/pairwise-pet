
class PetStats {
  static get MAX_LEVEL() { return 100; }
  static get MAX_EXP() { return Number.MAX_SAFE_INTEGER; }

  constructor() {
    this.level = 1;
    this.exp = 0;
    this.intimacy = 0;
    this.evolutionStage = 0;
    this.base = { hp: 10, attack: 5, defense: 5, speed: 5 };
  }

  gainExp(amount) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return;
    }
    let remaining = Math.min(this.exp + amount, PetStats.MAX_EXP);
    if (this.level >= PetStats.MAX_LEVEL) {
      this.exp = 0;
      return;
    }
    while (remaining >= this.expToNext()) {
      remaining -= this.expToNext();
      this.level++;
      if (this.level >= PetStats.MAX_LEVEL) {
        this.exp = 0;
        return;
      }
    }
    this.exp = remaining;
  }

  expToNext() {
    return this.level * 100;
  }

  applyBaseStats(partial) {
    if (!partial) return;
    for (const key of Object.keys(partial)) {
      this.base[key] = partial[key];
    }
  }

  snapshot() {
    return {
      level: this.level,
      exp: this.exp,
      intimacy: this.intimacy,
      evolutionStage: this.evolutionStage,
      base: Object.assign({}, this.base),
    };
  }

  restore(snapshot) {
    this.level = snapshot.level;
    this.exp = snapshot.exp;
    this.intimacy = snapshot.intimacy;
    this.evolutionStage = snapshot.evolutionStage;
    this.base = Object.assign({}, snapshot.base);
  }

  convertExp(rule) {
    if (!rule || rule === 'keep' || rule.type === 'keep') return;
    if (rule.type === 'convert' && typeof rule.ratio === 'number') {
      this.exp = Math.min(Math.floor(this.exp * rule.ratio), PetStats.MAX_EXP);
    }
  }
}

module.exports = { PetStats };
