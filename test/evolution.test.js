
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

  test('等级满足但道具、时间、地点任一不满足时不进化', () => {
    const chain = [{
      stage: 1,
      condition: {
        level: 10,
        intimacy: 80,
        item: {id: 'evo-stone', count: 1},
        location: 'ancient-ruins',
        time: {hourFrom: 18, hourTo: 23},
      },
    }];
    const pet = new Pet('ruin-mon');
    pet.configureEvolution(chain);
    pet.stats.level = 10;
    pet.stats.intimacy = 80;
    pet.inventory['evo-stone'] = 1;
    pet.location = 'ancient-ruins';

    const daytime = new Date(2026, 8, 27, 12, 0, 0);
    expect(pet.evolution.checkEvolution(daytime)).toBe(false);
    expect(pet.stats.evolutionStage).toBe(0);

    const night = new Date(2026, 8, 27, 20, 0, 0);
    expect(pet.evolution.checkEvolution(night)).toBe(true);
    expect(pet.stats.evolutionStage).toBe(1);
  });

  test('满足全部条件时通过 gainExp 立即触发,无需重新登录', () => {
    const pet = new Pet('exp-mon');
    pet.evolution.addCondition(1, {level: 3, intimacy: 20});
    pet.stats.intimacy = 20;
    pet.gainExp(350);
    expect(pet.stats.level).toBe(3);
    expect(pet.stats.evolutionStage).toBe(1);
  });

  test('进化失败时原子回滚,不留半成品状态并退还道具', () => {
    const pet = new Pet('atomic-mon');
    pet.evolution.addCondition(
      1,
      {level: 5, item: 'evo-stone'},
      () => { throw new Error('形态转换失败'); },
    );
    pet.addItem('evo-stone', 1);
    pet.stats.level = 5;
    expect(() => pet.evolution.checkEvolution()).toThrow('形态转换失败');
    expect(pet.stats.evolutionStage).toBe(0);
    expect(pet.hasItem('evo-stone')).toBe(true);
    expect(pet.evolution.log.length).toBe(0);
  });

  test('进化后正确转换基础属性、外观与名字,不只是改名', () => {
    const pet = new Pet('tiny-dragon');
    pet.evolution.addCondition(
      1,
      {level: 10},
      {
        name: 'fire-dragon',
        form: 'fire',
        appearance: {color: 'red', size: 'large'},
        baseStats: {hp: 40, attack: 25},
        skills: ['flame-breath'],
      },
    );
    pet.stats.level = 10;
    pet.evolution.checkEvolution();
    expect(pet.name).toBe('fire-dragon');
    expect(pet.form).toBe('fire');
    expect(pet.appearance).toEqual({color: 'red', size: 'large'});
    expect(pet.stats.base.hp).toBe(40);
    expect(pet.stats.base.attack).toBe(25);
    expect(pet.stats.base.defense).toBe(5);
  });

  test('不同宠物可以配置不同的进化链与条件', () => {
    const chainA = [{
      stage: 1,
      condition: {level: 5, item: 'stone-a'},
      transform: {form: 'a1'},
    }];
    const chainB = [{
      stage: 1,
      condition: {level: 20, intimacy: 90, location: 'sea'},
      transform: {form: 'b1'},
    }];
    const petA = new Pet('mon-a');
    const petB = new Pet('mon-b');
    petA.configureEvolution(chainA);
    petB.configureEvolution(chainB);
    petA.stats.level = 5;
    petA.addItem('stone-a', 1);
    expect(petA.stats.evolutionStage).toBe(1);
    petB.stats.level = 20;
    petB.stats.intimacy = 90;
    expect(petB.stats.evolutionStage).toBe(0);
    petB.setLocation('sea');
    expect(petA.form).toBe('a1');
    expect(petB.form).toBe('b1');
  });

  test('退化使用独立条件与独立日志,不复用进化条件', () => {
    const pet = new Pet('dual-mon');
    pet.evolution.addCondition(1, {level: 10}, {form: 'advanced'});
    pet.devolution.addCondition(1, {item: 'dewdrop'}, {form: 'base'});
    pet.stats.level = 10;
    pet.evolution.checkEvolution();
    expect(pet.form).toBe('advanced');

    expect(pet.devolution.check()).toBe(false);
    pet.addItem('dewdrop', 1);
    expect(pet.devolution.check()).toBe(true);
    expect(pet.stats.evolutionStage).toBe(0);
    expect(pet.form).toBe('base');
    expect(pet.evolution.log[0].type).toBe('evolution');
    expect(pet.devolution.log[0].type).toBe('devolution');
    expect(pet.evolution.log[0].conditions).not.toHaveProperty('item');
  });

  test('经验按规则转换且不溢出,默认保留不清零', () => {
    const keepPet = new Pet('keep-mon');
    keepPet.evolution.addCondition(1, {level: 5});
    keepPet.stats.level = 5;
    keepPet.stats.exp = 70;
    keepPet.evolution.checkEvolution();
    expect(keepPet.stats.exp).toBe(70);

    const convertPet = new Pet('convert-mon');
    convertPet.evolution.addCondition(
      1,
      {level: 5},
      {expRule: {type: 'convert', ratio: 0.5}},
    );
    convertPet.stats.level = 5;
    convertPet.stats.exp = 80;
    convertPet.evolution.checkEvolution();
    expect(convertPet.stats.exp).toBe(40);

    convertPet.gainExp(Number.MAX_SAFE_INTEGER);
    expect(Number.isSafeInteger(convertPet.stats.exp)).toBe(true);
  });

  test('多段进化必须按顺序,不能跳到最终形态', () => {
    const pet = new Pet('chain-mon');
    pet.evolution.addCondition(1, {level: 5}, {form: 'mid'});
    pet.evolution.addCondition(2, {level: 10}, {form: 'final'});
    pet.stats.level = 10;
    expect(() => pet.evolution.evolve(2)).toThrow('中间');
    pet.evolution.checkEvolution();
    expect(pet.form).toBe('mid');
    pet.evolution.checkEvolution();
    expect(pet.stats.evolutionStage).toBe(2);
    expect(pet.form).toBe('final');
  });

  test('进化日志包含时间、条件和前后形态', () => {
    const pet = new Pet('log-mon');
    pet.form = 'base-form';
    pet.evolution.addCondition(
      1,
      {level: 8, intimacy: 60},
      {form: 'grown-form'},
    );
    pet.stats.level = 8;
    pet.stats.intimacy = 60;
    const before = Date.now();
    pet.evolution.checkEvolution();
    const entry = pet.evolution.log[0];
    expect(entry.time).toBeGreaterThanOrEqual(before);
    expect(entry.conditions).toEqual({level: 8, intimacy: 60});
    expect(entry.fromForm).toBe('base-form');
    expect(entry.toForm).toBe('grown-form');
    expect(entry.fromStage).toBe(0);
    expect(entry.toStage).toBe(1);
  });

  test('已经进化的宠物不能再次触发同一进化', () => {
    const pet = new Pet('once-mon');
    pet.evolution.addCondition(1, {level: 5}, {form: 'grown'});
    pet.stats.level = 5;
    pet.evolution.checkEvolution();
    expect(pet.evolution.checkEvolution()).toBe(false);
    expect(pet.evolution.log.length).toBe(1);
    expect(() => pet.evolution.evolve(1)).toThrow('重复');
  });

  test('进化后原有技能继承,新技能去重追加', () => {
    const pet = new Pet('skill-mon');
    pet.skills = ['tackle', 'tail-wag'];
    pet.evolution.addCondition(
      1,
      {level: 5},
      {skills: ['tail-wag', 'power-bite']},
    );
    pet.stats.level = 5;
    pet.evolution.checkEvolution();
    expect(pet.skills).toEqual(['tackle', 'tail-wag', 'power-bite']);
  });
});
