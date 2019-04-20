// 2017/01/01
const history = { last: 1483228800000, subscriptions: [] };

function getNewVideos(publishedAt) {
  const videoDate = new Date(publishedAt).getTime();
  // if the item is newer than the last time we fetched videos (history)
  if (videoDate > history.last) {
    return true;
  }
  return false;
}

// dates past history
const validDates = [
  '2019-04-20T14:01:34.849Z',
  '2018-01-01T00:10:20.000Z',
  '2017-01-02T00:02:00.022Z'
];
// dates before history
const invalidDates = [
  '2015-01-14T00:07:30.310Z',
  '2016-01-14T00:11:20.660Z',
  '2015-06-05T23:01:11.309Z'
];

describe('Returns true where dates are new', () => {
  validDates.forEach(date => {
    test('returns true', () => {
      expect(getNewVideos(date)).toBe(true);
    });
  });

  invalidDates.forEach(date => {
    test('returns false', () => {
      expect(getNewVideos(date)).toBe(false);
    });
  });
});
