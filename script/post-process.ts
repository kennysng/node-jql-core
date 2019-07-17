export default function process(content: string[]): string[] {
  const oldIndex = content.findIndex(line => line.startsWith('abstract class CompiledExpression')) - 5
  const newIndex = content.findIndex(line => line.startsWith('class CompiledColumnExpression')) - 5
  const subContent = content.splice(oldIndex, 25)
  for (let i = 0, length = subContent.length; i < length; i += 1) {
    content.splice(newIndex + i, 0, subContent[i])
  }
  return content
}
