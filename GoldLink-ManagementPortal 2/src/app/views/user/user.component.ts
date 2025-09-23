import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GlobalVariables } from '../../app.globals';

@Component({
  templateUrl: 'user.component.html'
})
export class UserComponent implements OnInit, OnDestroy {
  constructor(private g: GlobalVariables, private http: HttpClient, private r: Router) { }
  isLoaded:boolean = false;

  ngOnInit(): void {
    this.isLoaded = true;
  }

  ngOnDestroy(): void {
  }
}
