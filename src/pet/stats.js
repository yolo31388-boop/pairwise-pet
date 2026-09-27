class PetStats {
  constructor() {
    this.level = 1;
    this.exp = 0;
    this.intimacy = 0;
    this.evolutionStage = 0;
    this.attack = 10;
    this.defense = 10;
    this.hp = 100;
    this.form = 'base';
    this._evolutionHook = null;
  }

  gainExp(amount) {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
      throw new Error('经验值必须是非负有限数');
    }
    this.exp += amount;
    while (this.exp >= this.expToNext()) {
      this.exp -= this.expToNext();
      this.level++;
    }
    if (this._evolutionHook) this._evolutionHook();
  }

  expToNext() {
    return this.level * 100;
  }
}

module.exports = { PetStats };
