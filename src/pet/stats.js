
class PetStats {
  constructor() { this.level=1; this.exp=0; this.intimacy=0; this.evolutionStage=0; }
  gainExp(amount) {
    this.exp += amount;
    while (this.exp >= this.expToNext()) {
      this.exp -= this.expToNext();
      this.level++;
    }
  }
  expToNext() { return this.level * 100; }
}

module.exports = { PetStats };
