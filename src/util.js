import uniq from 'lodash/uniq'
import moment from 'moment'

export const tagRegExp = /#([\w]+)/g
export function getTagsFromLine(line) {
  const matchesArray = line.match(tagRegExp)
  return uniq(matchesArray).map(match => match.replace('#', ''))
}

export function tagToUrl(tag) {
  return `${tag.replace('#', '')}`
}

export const groupByDateFormat = 'MMMM DD'

export const defaultReminderTime = 0

export function browserHasPush() {
  return 'PushManager' in window
}

export function getYearForLine(line) {
  const createdAt = line.createdAt.toDate ?
    line.createdAt.toDate() : line.createdAt
  return moment(createdAt).format('YYYY')
}
