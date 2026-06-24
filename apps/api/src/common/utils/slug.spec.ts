import { toSlug, uniqueSlug } from './slug';

describe('toSlug', () => {
  it('lowercases and hyphenates ASCII words', () => {
    expect(toSlug('Michael Jordan')).toBe('michael-jordan');
  });

  it('transliterates Czech diacritics', () => {
    expect(toSlug('Tomáš Novák')).toBe('tomas-novak');
  });

  it('converts underscores to hyphens', () => {
    expect(toSlug('LeBron_James')).toBe('lebron-james');
  });

  it('collapses multiple spaces into one hyphen', () => {
    expect(toSlug('hello  world')).toBe('hello-world');
  });

  it('strips leading and trailing hyphens', () => {
    expect(toSlug('---test---')).toBe('test');
  });

  it('collapses consecutive hyphens', () => {
    expect(toSlug('hello--world')).toBe('hello-world');
  });

  it('preserves numbers', () => {
    expect(toSlug('Card 2024')).toBe('card-2024');
  });

  it('returns empty string for empty input', () => {
    expect(toSlug('')).toBe('');
  });

  it('returns empty string when all chars are special', () => {
    expect(toSlug('!@#$%^')).toBe('');
  });

  it('handles mixed case, numbers, and specials together', () => {
    expect(toSlug('Mixed CASE & 123!')).toBe('mixed-case-123');
  });

  it('transliterates café diacritics', () => {
    expect(toSlug('café')).toBe('cafe');
  });
});

describe('uniqueSlug', () => {
  it('returns the candidate when it does not exist', async () => {
    const exists = jest.fn().mockResolvedValue(false);
    expect(await uniqueSlug('michael-jordan', exists)).toBe('michael-jordan');
    expect(exists).toHaveBeenCalledTimes(1);
    expect(exists).toHaveBeenCalledWith('michael-jordan');
  });

  it('appends -2 on first conflict', async () => {
    const exists = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    expect(await uniqueSlug('michael-jordan', exists)).toBe('michael-jordan-2');
  });

  it('appends -3 when both candidate and -2 are taken', async () => {
    const exists = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    expect(await uniqueSlug('michael-jordan', exists)).toBe('michael-jordan-3');
  });

  it('calls exists with the correct suffixed slugs in order', async () => {
    const exists = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await uniqueSlug('test', exists);
    expect(exists).toHaveBeenNthCalledWith(1, 'test');
    expect(exists).toHaveBeenNthCalledWith(2, 'test-2');
    expect(exists).toHaveBeenNthCalledWith(3, 'test-3');
  });
});
