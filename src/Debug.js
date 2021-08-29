class Debug {
  static params(...args) {
    let i = 0;
    for (const arg of args) {
      if (this.invalid(arg)) throw new Error(`Missing param at #${i} '${arg}'.`);
      i++;
    }
  }

  static invalid(value) {
    return (value === undefined || value === false);
  }
}

module.exports = Debug;
