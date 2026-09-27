
const { Pet } = require('../src/pet/pet.js');

describe('宠物养成进化', () => {
  test('全部条件验证', () => {
    const pet = new Pet('test');
    pet.evolution.addCondition(1, {level: 10, intimacy: 50});
    pet.stats.level = 10;
    pet.stats.intimacy = 0;
    expect(pet.evolution.check()).toBe(false);
  });
  test('条件满足立即触发', () => {
    const pet = new Pet('test');
    pet.evolution.addCondition(1, {level: 5});
    pet.stats.level = 5;
    expect(pet.evolution.check()).toBe(true);
    expect(pet.stats.evolutionStage).toBe(1);
  });
  test('进化经验保留', () => {
    const pet = new Pet('test');
    pet.evolution.addCondition(1, {level: 5});
    pet.stats.level = 5;
    pet.stats.exp = 30;
    pet.evolution.check();
    expect(pet.stats.exp).toBe(30);
  });
  test('多段顺序进化', () => {
    const pet = new Pet('test');
    pet.evolution.addCondition(1, {level: 5});
    pet.evolution.addCondition(2, {level: 10});
    pet.stats.level = 10;
    pet.evolution.check();
    expect(pet.stats.evolutionStage).toBe(1);
    pet.evolution.check();
    expect(pet.stats.evolutionStage).toBe(2);
  });
  test('进化日志', () => {
    const pet = new Pet('test');
    pet.evolution.addCondition(1, {level: 5});
    pet.stats.level = 5;
    pet.evolution.check();
    expect(pet.evolution.log.length).toBe(1);
  });
  test('已进化不重复', () => {
    const pet = new Pet('test');
    pet.evolution.addCondition(1, {level: 5});
    pet.stats.level = 5;
    pet.evolution.check();
    expect(pet.evolution.check()).toBe(false);
  });
  test('条件不满足不触发', () => {
    const pet = new Pet('test');
    pet.evolution.addCondition(1, {level: 100});
    pet.stats.level = 5;
    expect(pet.evolution.check()).toBe(false);
  });
});
