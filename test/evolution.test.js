
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

describe('进化系统不变量', () => {
  test('全部条件验证：等级够但亲密度/道具/时间/地点不足不进化', () => {
    const pet = new Pet('multi');
    pet.evolution.addCondition(1, {
      level: 5, intimacy: 50, item: '火之石', time: 'night', location: 'volcano',
    });
    pet.stats.level = 10;
    pet.stats.intimacy = 0;
    expect(pet.evolution.checkEvolution()).toBe(false);
    pet.stats.intimacy = 60;
    expect(pet.evolution.checkEvolution()).toBe(false);
    pet.addItem('火之石');
    expect(pet.stats.evolutionStage).toBe(0);
    pet.environment.time = 'night';
    pet.environment.location = 'volcano';
    expect(pet.evolution.checkEvolution()).toBe(true);
    expect(pet.stats.evolutionStage).toBe(1);
  });

  test('条件满足立即触发：gainExp 升级后无需重新登录或手动调用', () => {
    const pet = new Pet('auto');
    pet.evolution.addCondition(1, { level: 3 });
    pet.gainExp(300);
    expect(pet.stats.level).toBe(3);
    expect(pet.stats.evolutionStage).toBe(1);
  });

  test('亲密度达标时立即触发进化', () => {
    const pet = new Pet('bond');
    pet.evolution.addCondition(1, { level: 5, intimacy: 80 });
    pet.stats.level = 5;
    pet.setIntimacy(80);
    expect(pet.stats.evolutionStage).toBe(1);
  });

  test('进化原子性：转换规则非法时回滚全部状态', () => {
    const pet = new Pet('atomic');
    pet.evolution.addCondition(1, { level: 5 }, {
      form: 'broken',
      stats: { attack: 'not-a-number' },
    });
    pet.stats.level = 5;
    pet.stats.exp = 42;
    expect(() => pet.evolution.checkEvolution()).toThrow();
    expect(pet.stats.evolutionStage).toBe(0);
    expect(pet.stats.form).toBe('base');
    expect(pet.stats.exp).toBe(42);
    expect(pet.evolution.log.length).toBe(0);
  });

  test('属性正确转换：形态、属性倍率、新技能全部生效且名字不变', () => {
    const pet = new Pet('morph');
    pet.evolution.addCondition(1, { level: 5 }, {
      form: 'firepup',
      stats: { attack: { multiply: 2 }, hp: 50 },
      skills: ['flame'],
    });
    pet.stats.level = 5;
    pet.evolution.checkEvolution();
    expect(pet.stats.form).toBe('firepup');
    expect(pet.stats.attack).toBe(20);
    expect(pet.stats.hp).toBe(150);
    expect(pet.skills).toContain('flame');
    expect(pet.name).toBe('morph');
  });

  test('条件可配置：不同宠物有独立的进化链与条件', () => {
    const a = new Pet('A');
    const b = new Pet('B');
    a.evolution.addCondition(1, { level: 5 });
    b.evolution.addCondition(1, { level: 8, intimacy: 20 });
    a.stats.level = 6;
    b.stats.level = 6;
    expect(a.evolution.checkEvolution()).toBe(true);
    expect(b.evolution.checkEvolution()).toBe(false);
    expect(a.stats.evolutionStage).toBe(1);
    expect(b.stats.evolutionStage).toBe(0);
  });

  test('退化独立逻辑：独立条件触发退化，不复用进化条件', () => {
    const pet = new Pet('devo');
    pet.evolution.addCondition(1, { level: 5 }, { form: 'mid' });
    pet.evolution.addDevolutionCondition(1, { intimacyBelow: 10 }, { form: 'base' });
    pet.stats.level = 5;
    pet.stats.intimacy = 90;
    pet.evolution.checkEvolution();
    expect(pet.stats.evolutionStage).toBe(1);
    pet.stats.intimacy = 5;
    expect(pet.evolution.checkDevolution()).toBe(true);
    expect(pet.stats.evolutionStage).toBe(0);
    expect(pet.stats.form).toBe('base');
    expect(pet.evolution.devolutionLog.length).toBe(1);
    expect(pet.evolution.log.length).toBe(1);
  });

  test('经验值转换：按比例保留且不清零不溢出', () => {
    const pet = new Pet('exp');
    pet.evolution.addCondition(1, { level: 5 }, { expMode: 0.5 });
    pet.stats.level = 5;
    pet.stats.exp = 80;
    pet.evolution.checkEvolution();
    expect(pet.stats.exp).toBe(40);
    expect(pet.stats.exp).toBeLessThan(pet.stats.expToNext());
    const pet2 = new Pet('exp2');
    pet2.evolution.addCondition(1, { level: 5 }, { expMode: 'reset' });
    pet2.stats.level = 5;
    pet2.stats.exp = 80;
    pet2.evolution.checkEvolution();
    expect(pet2.stats.exp).toBe(0);
  });

  test('多段顺序进化：不能跳过中间阶段', () => {
    const pet = new Pet('chain');
    pet.evolution.addCondition(1, { level: 5 });
    pet.evolution.addCondition(2, { level: 10 });
    pet.evolution.addCondition(3, { level: 20 });
    pet.stats.level = 25;
    expect(() => pet.evolution.evolve(3)).toThrow();
    expect(pet.stats.evolutionStage).toBe(0);
    pet.evolution.checkEvolution();
    expect(pet.stats.evolutionStage).toBe(1);
    pet.evolution.checkEvolution();
    expect(pet.stats.evolutionStage).toBe(2);
    pet.evolution.checkEvolution();
    expect(pet.stats.evolutionStage).toBe(3);
  });

  test('进化日志包含时间、条件与前后形态', () => {
    const pet = new Pet('logger');
    pet.evolution.addCondition(1, { level: 5, intimacy: 30 }, { form: 'mid' });
    pet.stats.level = 5;
    pet.stats.intimacy = 30;
    pet.evolution.checkEvolution();
    expect(pet.evolution.log.length).toBe(1);
    const entry = pet.evolution.log[0];
    expect(typeof entry.time).toBe('number');
    expect(entry.conditions).toEqual({ level: 5, intimacy: 30 });
    expect(entry.from).toBe('base');
    expect(entry.to).toBe('mid');
  });

  test('已进化的宠物不会重复触发同一进化', () => {
    const pet = new Pet('once');
    pet.evolution.addCondition(1, { level: 5 });
    pet.stats.level = 5;
    expect(pet.evolution.checkEvolution()).toBe(true);
    expect(pet.evolution.checkEvolution()).toBe(false);
    pet.gainExp(1000);
    expect(pet.evolution.log.length).toBe(1);
    expect(pet.stats.evolutionStage).toBe(1);
  });

  test('条件不满足不触发：状态与日志保持不变', () => {
    const pet = new Pet('nope');
    pet.evolution.addCondition(1, { level: 10, intimacy: 100 });
    pet.stats.level = 9;
    pet.stats.intimacy = 100;
    expect(pet.evolution.checkEvolution()).toBe(false);
    expect(pet.stats.evolutionStage).toBe(0);
    expect(pet.evolution.log.length).toBe(0);
  });

  test('进化后技能继承：原有技能保留并追加新技能', () => {
    const pet = new Pet('skill');
    pet.skills.push('tackle');
    pet.evolution.addCondition(1, { level: 5 }, { skills: ['flame', 'dash'] });
    pet.stats.level = 5;
    pet.evolution.checkEvolution();
    expect(pet.skills).toEqual(['tackle', 'flame', 'dash']);
  });
});
