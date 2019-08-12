import { NEVER, Observable } from 'rxjs';
import { catchError, finalize, map, mergeMap } from 'rxjs/operators';

function concurrentConcatAllOperator<T>(input$: Observable<Observable<T>>): Observable<T> {
  const buffer: Map<number, T[]> = new Map();
  let completedBuffers: number[] = [];
  let currentIndex = 0;

  return new Observable<T>(observer => {
    const sub = input$
      .pipe(
        mergeMap((inner$: Observable<T>, index: number) => {
          return inner$.pipe(
            map(v => {
              if (currentIndex === index) {
                observer.next(v);
              } else {
                if (!buffer.has(index)) {
                  buffer.set(index, []);
                }
                buffer.get(index).push(v);
              }
            }),
            finalize(() => {
              if (currentIndex === index) {
                completedBuffers.sort().forEach(bufferIndex => {
                  buffer.get(bufferIndex).forEach(v => observer.next(v));
                  buffer.delete(bufferIndex);
                });

                currentIndex = completedBuffers.length ? completedBuffers.pop() + 1 : currentIndex + 1;
                if (buffer.has(currentIndex)) {
                  buffer.get(currentIndex).forEach(v => observer.next(v));
                }
                completedBuffers = [];
              } else {
                completedBuffers.push(index);
              }
            }),
            catchError(e => {
              observer.error(e);
              return NEVER;
            }),
          );
        }),
      )
      .subscribe({
        error: e => observer.error(e),
        complete: () => observer.complete(),
      });

    return () => sub.unsubscribe();
  });
}

export function concurrentConcatAll<T>(): (input$: Observable<Observable<T>>) => Observable<T> {
  return concurrentConcatAllOperator;
}
