export default function process(content: string[]): string[] {
  const subContent = content.splice(5168, 24)
  for (let i = 0, length = subContent.length; i < length; i += 1) {
    content.splice(3007 + i, 0, subContent[i])
  }
  return content
}
