export default function process(content: string[]): string[] {
  const subContent = content.splice(5133, 24)
  for (let i = 0, length = subContent.length; i < length; i += 1) {
    content.splice(2972 + i, 0, subContent[i])
  }
  return content
}
