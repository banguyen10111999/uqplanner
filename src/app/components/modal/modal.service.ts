import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ModalSettings, ModalButton } from './modal';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private modalDisplaySource: Subject<ModalSettings> = new Subject<ModalSettings>();
  private modalCloseSource: Subject<boolean> = new Subject<boolean>();

  public modalDisplayEvent: Observable<ModalSettings> = this.modalDisplaySource.asObservable();
  public modalCloseEvent: Observable<boolean> = this.modalCloseSource.asObservable();

  constructor() {

  }

  public closeModal(): void {
    this.modalCloseSource.next(true);
  }

  public showModal(modal: ModalSettings): void {
    this.modalDisplaySource.next(modal);
    console.log('b');
  }

  public showConfirmationModal(title: string, text: string, yesAction: () => void): void {
    const yesButton: ModalButton = new ModalButton('Yes', () => {
      yesAction();
      this.closeModal();
    });

    const noButton: ModalButton = new ModalButton('No', () => this.closeModal());

    this.showModal(new ModalSettings(title, text, [yesButton, noButton]));
  }
}
