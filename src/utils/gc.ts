export default function gc() {
  if (global && global.gc) global.gc()
  if (window && window['gc']) window['gc']()
}
